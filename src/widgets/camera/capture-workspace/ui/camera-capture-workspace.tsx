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
import { useConfirm } from "@shared/lib";
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
      "촬영 사진 목록 갱신 실패",
      "사진은 저장됐지만 프로필 목록을 갱신하지 못했습니다. 프로필에서 다시 시도해주세요.",
    );
  }, []);

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
      title: "실시간 공유를 시작할까요?",
      message: "촬영 화면이 참여자에게 실시간으로 공유됩니다.",
      confirmText: "공유 준비하기",
      cancelText: "취소",
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
        title: "실시간 공유를 종료할까요?",
        message: "종료 전에 방에 저장할 촬영 사진을 선택할 수 있습니다.",
        confirmText: "종료하기",
        cancelText: "계속 공유",
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
                "사진 촬영 한도",
                `한 방에서 사진은 최대 ${maxPhotos}장까지 촬영할 수 있습니다.`,
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
