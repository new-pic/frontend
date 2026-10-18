import { RTC_MAX_CAPTURED_PHOTOS } from "@entities/rtc-room";
import {
  Camera,
  type CameraRuntimeGeometry,
  type SessionPhoto,
} from "@features/camera/capture-photo";
import {
  CameraGuideFeedbackBanner,
  CameraGuideOverlay,
  CameraGuideReferenceOverlay,
  type GuideFeedSelection,
  GuideFeedBottomSheet,
  GuideSelectionControl,
  useCameraGuideController,
} from "@features/camera/guide-feed";
import {
  RtcEndPhotoSelection,
  useRtcEndPhotoPreparation,
} from "@features/rtc/finalize-session";
import {
  RtcCameraRoomMenu,
  RtcFinalizationOverlay,
  RtcHostLiveKit,
  RtcSharingSheet,
  type RtcHostResultImage,
  useRtcHostSessionController,
} from "@features/rtc/host-controls";
import { RtcHostReactionBubbles } from "@features/rtc/reactions";
import { visionCameraRtcFrameSink } from "@newpic/vision-camera-rtc";
import { RTC_NAVIGATION } from "@shared/config";
import { useAppTranslation, useConfirm } from "@shared/lib";
import { Box, FramingGridOverlay, VStack } from "@shared/ui";
import * as Linking from "expo-linking";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraHeader } from "./camera-header";
import { CapturedPhotosLayer } from "./captured-photos-layer";

export interface CameraCaptureWorkspaceHandle {
  requestExit: () => void;
}

interface CameraCaptureWorkspaceProps {
  isFocused: boolean;
  initialGuideFeedId?: string;
  initialGuideSelection: GuideFeedSelection | null;
  isInitialGuidePending: boolean;
  isInitialGuideError: boolean;
  onRetryInitialGuide: () => void;
  onOpenJoin: () => void;
  onExitBlockedChange: (isBlocked: boolean) => void;
  onRequestRouteExit: () => void;
  onResultReady: (
    images: RtcHostResultImage[],
    exitAfterResult: boolean,
  ) => void;
}

export const CameraCaptureWorkspace = forwardRef<
  CameraCaptureWorkspaceHandle,
  CameraCaptureWorkspaceProps
>(function CameraCaptureWorkspace(
  {
    isFocused,
    initialGuideFeedId,
    initialGuideSelection,
    isInitialGuidePending,
    isInitialGuideError,
    onRetryInitialGuide,
    onOpenJoin,
    onExitBlockedChange,
    onRequestRouteExit,
    onResultReady,
  },
  ref,
) {
  const { t } = useAppTranslation();
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isGuideSheetOpen, setIsGuideSheetOpen] = useState(false);
  const [isGuideReferenceVisible, setIsGuideReferenceVisible] = useState(false);
  const [cameraGeometry, setCameraGeometry] =
    useState<CameraRuntimeGeometry | null>(null);
  const [isVisionCameraActive, setIsVisionCameraActive] = useState(isFocused);
  const [isVisionCameraRunning, setIsVisionCameraRunning] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<SessionPhoto[]>([]);
  const [isCapturedPhotosOpen, setIsCapturedPhotosOpen] = useState(false);
  const shouldExitAfterResultRef = useRef(false);
  const appliedInitialGuideFeedIdRef = useRef<string | null>(null);
  const openConfirm = useConfirm();
  const {
    isSelectionOpen,
    preparePhotos,
    confirmSelection,
    getPreparedImages,
    getSelectedPhotos,
    reset: resetEndPhotoPreparation,
  } = useRtcEndPhotoPreparation();

  const handleResultRefreshError = useCallback(() => {
    Alert.alert(
      t("rtc.errors.resultListRefreshTitle"),
      t("rtc.errors.resultListRefreshDescription"),
    );
  }, [t]);

  const handleResultReady = useCallback(
    (images: RtcHostResultImage[]) => {
      setIsGuideSheetOpen(false);
      setIsCapturedPhotosOpen(false);
      setIsVisionCameraRunning(false);
      setIsVisionCameraActive(false);
      setCapturedPhotos([]);
      resetEndPhotoPreparation();
      onResultReady(images, shouldExitAfterResultRef.current);
      shouldExitAfterResultRef.current = false;
    },
    [onResultReady, resetEndPhotoPreparation],
  );

  const hostController = useRtcHostSessionController({
    isCameraFocused: isFocused,
    isCameraRunning: isVisionCameraRunning,
    prepareEndPhotos: preparePhotos,
    getPreparedEndImages: getPreparedImages,
    getSelectedEndPhotos: getSelectedPhotos,
    onResultReady: handleResultReady,
    onResultRefreshError: handleResultRefreshError,
  });

  const {
    hostSession,
    broadcastConnection,
    participants,
    endRequestId,
    finalizationState,
    isBusy,
    isStarting,
    isExitBlocked,
    isFinalizationPending,
    prepareSharing,
    cancelPreparedSharing,
    startBroadcast,
    requestTermination,
    prepareEndPhotos,
    endRoom,
    completeTermination,
    handleFinalizationStateChange,
  } = hostController;

  const cameraGuide = useCameraGuideController({
    cameraActive: isFocused && isVisionCameraActive && isVisionCameraRunning,
    geometry: cameraGeometry,
  });
  const { selectGuide, retrySelectedGuide, clearGuide } = cameraGuide;
  const hasGuideError = Object.values(cameraGuide.errors).some(Boolean);
  const initialGuideNotApplied =
    Boolean(initialGuideFeedId) &&
    appliedInitialGuideFeedIdRef.current !== initialGuideFeedId;
  const hasInitialGuideError = initialGuideNotApplied && isInitialGuideError;
  const isGuideReferenceAvailable = Boolean(
    cameraGeometry &&
    cameraGuide.presentedGuide?.outline &&
    cameraGeometry.aspectRatio === cameraGuide.presentedGuide.cameraAspectRatio,
  );
  const qrValue = useMemo(
    () =>
      hostSession
        ? Linking.createURL(RTC_NAVIGATION.paths.join, {
            queryParams: {
              [RTC_NAVIGATION.params.code]: hostSession.joinCode,
            },
          })
        : "",
    [hostSession],
  );

  useEffect(() => {
    setIsVisionCameraActive(isFocused);
  }, [isFocused]);

  useEffect(() => {
    if (
      !initialGuideFeedId ||
      !initialGuideSelection ||
      appliedInitialGuideFeedIdRef.current === initialGuideFeedId
    ) {
      return;
    }

    appliedInitialGuideFeedIdRef.current = initialGuideFeedId;
    setIsGuideReferenceVisible(false);
    selectGuide(initialGuideSelection);
  }, [initialGuideFeedId, initialGuideSelection, selectGuide]);

  const handleCommandResult = useCallback(
    (result: Awaited<ReturnType<typeof startBroadcast>>) => {
      if (!result) return false;
      if (!result.ok) Alert.alert(result.title, result.message);
      return result.ok;
    },
    [],
  );

  const handleOpenShare = useCallback(async () => {
    const confirmed = await openConfirm({
      title: t("rtc.host.startConfirmTitle"),
      message: t("rtc.host.startConfirmDescription"),
      confirmText: t("rtc.host.prepareShare"),
      cancelText: t("common.actions.cancel"),
    });
    if (!confirmed) return;

    const result = await prepareSharing();
    if (!handleCommandResult(result)) return;

    setCapturedPhotos([]);
    resetEndPhotoPreparation();
    setIsShareSheetOpen(true);
  }, [
    handleCommandResult,
    openConfirm,
    prepareSharing,
    resetEndPhotoPreparation,
    t,
  ]);

  const handleCancelShare = useCallback(async () => {
    const result = await cancelPreparedSharing();
    if (!handleCommandResult(result)) return;

    resetEndPhotoPreparation();
    setIsShareSheetOpen(false);
  }, [cancelPreparedSharing, handleCommandResult, resetEndPhotoPreparation]);

  const handleStartShare = useCallback(async () => {
    const result = await startBroadcast();
    if (handleCommandResult(result)) setIsShareSheetOpen(false);
  }, [handleCommandResult, startBroadcast]);

  const handleRequestEndRoom = useCallback(
    async (exitAfterResult: boolean) => {
      if (!broadcastConnection || isFinalizationPending) {
        return;
      }

      const confirmed = await openConfirm({
        title: t("rtc.host.endConfirmTitle"),
        message: t("rtc.host.endConfirmDescription"),
        confirmText: t("rtc.host.end"),
        cancelText: t("rtc.host.keepSharing"),
        destructive: true,
      });
      if (!confirmed) return;

      shouldExitAfterResultRef.current = exitAfterResult;
      requestTermination();
    },
    [
      broadcastConnection,
      isFinalizationPending,
      openConfirm,
      requestTermination,
      t,
    ],
  );

  const handleRequestExit = useCallback(() => {
    if (!broadcastConnection) {
      onRequestRouteExit();
      return;
    }

    void handleRequestEndRoom(true);
  }, [handleRequestEndRoom, broadcastConnection, onRequestRouteExit]);

  useImperativeHandle(ref, () => ({ requestExit: handleRequestExit }), [
    handleRequestExit,
  ]);

  useEffect(() => {
    onExitBlockedChange(isExitBlocked);
  }, [isExitBlocked, onExitBlockedChange]);

  const handleCameraGeometryChange = useCallback(
    (geometry: CameraRuntimeGeometry | null) => {
      setCameraGeometry((current) => {
        if (current === geometry) return current;
        if (!current || !geometry) return geometry;

        const isSame =
          current.aspectRatio === geometry.aspectRatio &&
          current.cameraPosition === geometry.cameraPosition &&
          current.captureMirrorX === geometry.captureMirrorX &&
          current.captureSize.width === geometry.captureSize.width &&
          current.captureSize.height === geometry.captureSize.height &&
          current.previewSize.width === geometry.previewSize.width &&
          current.previewSize.height === geometry.previewSize.height;
        return isSame ? current : geometry;
      });
    },
    [],
  );

  const handleSelectGuide = useCallback(
    (selection: GuideFeedSelection) => {
      if (initialGuideFeedId) {
        appliedInitialGuideFeedIdRef.current = initialGuideFeedId;
      }
      setIsGuideReferenceVisible(false);
      selectGuide(selection);
    },
    [initialGuideFeedId, selectGuide],
  );

  const handleRetryGuide = useCallback(() => {
    if (hasInitialGuideError) {
      onRetryInitialGuide();
      return;
    }
    retrySelectedGuide();
  }, [hasInitialGuideError, onRetryInitialGuide, retrySelectedGuide]);

  return (
    <>
      <SafeAreaView edges={["top"]} className="flex-1">
        <VStack className="h-full">
          <Camera
            isActive={isVisionCameraActive}
            onClose={handleRequestExit}
            renderHeader={({ onOpenSettings, presentation }) => (
              <CameraHeader
                presentation={presentation}
                onBackPress={handleRequestExit}
                onSettingsPress={onOpenSettings}
                rtcControl={
                  <RtcCameraRoomMenu
                    appearance={presentation}
                    participants={participants}
                    isLive={Boolean(broadcastConnection)}
                    isBusy={isBusy}
                    isCameraReady={isVisionCameraRunning}
                    onSharePress={() => void handleOpenShare()}
                    onJoinPress={onOpenJoin}
                    onEndRoomPress={() => void handleRequestEndRoom(false)}
                  />
                }
              />
            )}
            onStarted={() => setIsVisionCameraRunning(true)}
            onStopped={() => setIsVisionCameraRunning(false)}
            photos={capturedPhotos}
            maxPhotos={RTC_MAX_CAPTURED_PHOTOS}
            onPhotoTaken={(photo) =>
              setCapturedPhotos((previous) =>
                previous.length >= RTC_MAX_CAPTURED_PHOTOS
                  ? previous
                  : [...previous, photo],
              )
            }
            onPhotoLimitReached={(maxPhotos) => {
              Alert.alert(
                t("camera.captureLimitTitle"),
                t("camera.captureLimit", { count: maxPhotos }),
              );
            }}
            onOpenPhotos={() => setIsCapturedPhotosOpen(true)}
            videoFrameSink={visionCameraRtcFrameSink}
            poseFrameSink={cameraGuide.poseDetection.frameSink}
            guideAspectRatio={cameraGuide.presentedGuide?.cameraAspectRatio}
            onRuntimeGeometryChange={handleCameraGeometryChange}
            previewOverlay={
              <>
                <FramingGridOverlay />
                {isGuideReferenceAvailable &&
                cameraGeometry &&
                cameraGuide.presentedGuide?.outline ? (
                  <>
                    {isGuideReferenceVisible ? (
                      <CameraGuideReferenceOverlay
                        imageUrl={
                          cameraGuide.presentedGuide.selection.detailImageUrl
                        }
                        sourceSize={
                          cameraGuide.presentedGuide.outline.sourceSize
                        }
                        previewSize={cameraGeometry.previewSize}
                      />
                    ) : null}
                    <CameraGuideOverlay
                      previewSize={cameraGeometry.previewSize}
                      outline={cameraGuide.presentedGuide.outline}
                      warning={
                        cameraGuide.alignment.alignmentState === "MISALIGNED"
                      }
                    />
                  </>
                ) : null}
                {broadcastConnection && hostSession ? (
                  <RtcHostReactionBubbles
                    active={isFocused && isVisionCameraActive}
                    roomId={hostSession.roomId}
                  />
                ) : null}
              </>
            }
            previewControl={
              <CameraGuideFeedbackBanner
                feedback={cameraGuide.alignment.feedback}
                isPersonLimitNoticeVisible={
                  cameraGuide.isPersonLimitNoticeVisible
                }
              />
            }
            renderStageControl={({ presentation }) => (
              <GuideSelectionControl
                selectedGuide={cameraGuide.selectedGuide}
                isPreparing={
                  (initialGuideNotApplied && isInitialGuidePending) ||
                  cameraGuide.isPreparing ||
                  cameraGuide.isTargetLoading ||
                  cameraGuide.isOutlineLoading
                }
                hasError={hasInitialGuideError || hasGuideError}
                isReferenceVisible={isGuideReferenceVisible}
                isReferenceAvailable={isGuideReferenceAvailable}
                topOffset={presentation === "overlay" ? 64 : 12}
                onOpen={() => setIsGuideSheetOpen(true)}
                onRetry={handleRetryGuide}
                onToggleReference={() =>
                  setIsGuideReferenceVisible((visible) => !visible)
                }
              />
            )}
          />
        </VStack>
      </SafeAreaView>

      <GuideFeedBottomSheet
        open={isGuideSheetOpen}
        selectedFeedId={cameraGuide.selectedGuide?.feedId}
        onSelect={handleSelectGuide}
        onClear={() => {
          setIsGuideReferenceVisible(false);
          clearGuide();
        }}
        onClose={() => setIsGuideSheetOpen(false)}
      />

      {broadcastConnection ? (
        <RtcHostLiveKit
          connection={broadcastConnection}
          isActive={isFocused && isVisionCameraActive}
          onPrepareEndRoom={prepareEndPhotos}
          onEndRoom={endRoom}
          onStopped={completeTermination}
          endRequestId={endRequestId}
          onFinalizationStateChange={handleFinalizationStateChange}
        />
      ) : null}

      {isShareSheetOpen && hostSession ? (
        <RtcSharingSheet
          joinCode={hostSession.joinCode}
          qrValue={qrValue}
          participantCount={participants.length}
          canStart={isVisionCameraRunning}
          isStarting={isStarting}
          onCancel={() => void handleCancelShare()}
          onStart={() => void handleStartShare()}
        />
      ) : null}

      {isSelectionOpen ? (
        <Box className="absolute inset-0 z-50">
          <RtcEndPhotoSelection
            photos={capturedPhotos}
            onConfirm={confirmSelection}
          />
        </Box>
      ) : null}

      <CapturedPhotosLayer
        open={isCapturedPhotosOpen}
        photos={capturedPhotos}
        onClose={() => setIsCapturedPhotosOpen(false)}
      />

      <RtcFinalizationOverlay state={finalizationState} />
    </>
  );
});
