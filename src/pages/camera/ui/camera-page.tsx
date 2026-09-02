import { feedQuery } from "@entities/feed";
import {
  RTC_MAX_CAPTURED_PHOTOS,
  RtcEndRoomResponse,
} from "@entities/rtc-room";
import { type RtcLiveKitConnection, useRtcStore } from "@entities/rtc-session";
import {
  Camera,
  CameraRuntimeGeometry,
  SessionPhoto,
} from "@features/camera/capture-photo";
import {
  adaptFeedToGuideSelection,
  CAMERA_GUIDE_NAVIGATION,
  CameraGuideFeedbackBanner,
  CameraGuideNavigationSearchParams,
  CameraGuideOverlay,
  CameraGuideReferenceOverlay,
  GuideFeedBottomSheet,
  GuideSelectionControl,
  useCameraGuideController,
} from "@features/camera/guide-feed";
import {
  prepareRtcEndImages,
  RtcEndPhotoSelection,
  useResetMyRtcStoredPhotos,
} from "@features/rtc/finalize-session";
import {
  isRtcFinalizationBlocking,
  isRtcFinalizationPending,
  RtcCameraRoomMenu,
  RtcFinalizationOverlay,
  RtcHostLiveKit,
  RTC_HOST_ROOM_EXPIRES_IN_MINUTES,
  RtcSharingSheet,
  rtcHostQuery,
  type RtcHostFinalizationState,
  useRtcRoomEvents,
} from "@features/rtc/host-controls";
import { RtcHostReactionBubbles } from "@features/rtc/reactions";
import { RtcJoinSheet } from "@features/rtc/join-room";
import { visionCameraRtcFrameSink } from "@newpic/vision-camera-rtc";
import { getApiErrorMessage } from "@shared/api";
import { RTC_NAVIGATION, RtcNavigationSearchParams } from "@shared/config";
import { getFirstSearchParam, useConfirm } from "@shared/lib";
import { Box, FramingGridOverlay, VStack } from "@shared/ui";
import type { File } from "expo-file-system";
import * as Linking from "expo-linking";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CapturedPhotosLayer } from "./captured-photos-layer";
import { CameraHeader } from "./camera-header";
import { SharingResultPage } from "./sharing-result-page";

type CameraMode = "VISION_CAMERA" | "RESULT";
type CameraPageSearchParams = RtcNavigationSearchParams &
  CameraGuideNavigationSearchParams;

interface ResultImage {
  id: string;
  imageUrl: string;
}

interface EndPhotoSelectionRequest {
  resolve: (photos: SessionPhoto[]) => void;
  reject: (reason: Error) => void;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.";

export function CameraPage() {
  const searchParams = useLocalSearchParams<CameraPageSearchParams>();
  const joinCodeParam = searchParams[RTC_NAVIGATION.params.code];
  const joinSheetParam = searchParams[RTC_NAVIGATION.params.joinSheet];
  const initialGuideFeedId = getFirstSearchParam(
    searchParams[CAMERA_GUIDE_NAVIGATION.params.feedId],
  )?.trim();
  const {
    data: initialGuideData,
    isError: isInitialGuideError,
    isPending: isInitialGuidePending,
    refetch: refetchInitialGuide,
  } = feedQuery.useReadFeed({
    feedId: initialGuideFeedId,
  });
  const initialGuideSelection = useMemo(
    () =>
      initialGuideData ? adaptFeedToGuideSelection(initialGuideData) : null,
    [initialGuideData],
  );
  const returnJoinCode = Array.isArray(joinCodeParam)
    ? joinCodeParam[0]
    : joinCodeParam;
  const shouldRestoreJoinSheet =
    (Array.isArray(joinSheetParam) ? joinSheetParam[0] : joinSheetParam) ===
    RTC_NAVIGATION.values.joinSheetOpen;
  const hostSession = useRtcStore((state) => state.hostSession);
  const clearHostSession = useRtcStore((state) => state.clearHostSession);
  const createRoomMutation = rtcHostQuery.useCreateRtcRoom();
  const createHostTokenMutation = rtcHostQuery.useCreateHostLiveKitToken();
  const endRoomMutation = rtcHostQuery.useEndRtcRoom();
  const resetMyRtcStoredPhotos = useResetMyRtcStoredPhotos();
  const [cameraMode, setCameraMode] = useState<CameraMode>("VISION_CAMERA");
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isJoinSheetOpen, setIsJoinSheetOpen] = useState(false);
  const [isGuideSheetOpen, setIsGuideSheetOpen] = useState(false);
  const [isGuideReferenceVisible, setIsGuideReferenceVisible] = useState(false);
  const [cameraGeometry, setCameraGeometry] =
    useState<CameraRuntimeGeometry | null>(null);
  const [joinInitialCode, setJoinInitialCode] = useState<string | undefined>();
  const [isCameraPageFocused, setIsCameraPageFocused] = useState(false);
  const [isVisionCameraActive, setIsVisionCameraActive] = useState(true);
  const [isVisionCameraRunning, setIsVisionCameraRunning] = useState(false);
  const [broadcastConnection, setBroadcastConnection] =
    useState<RtcLiveKitConnection | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<SessionPhoto[]>([]);
  const [resultImages, setResultImages] = useState<ResultImage[] | null>(null);
  const [isEndPhotoSelectionOpen, setIsEndPhotoSelectionOpen] = useState(false);
  const [isCapturedPhotosOpen, setIsCapturedPhotosOpen] = useState(false);
  const [endRequestId, setEndRequestId] = useState(0);
  const [finalizationState, setFinalizationState] =
    useState<RtcHostFinalizationState>("IDLE");
  const isFinalizationBlocking = isRtcFinalizationBlocking(finalizationState);
  const isVisionCameraRunningRef = useRef(false);
  const isCameraPageFocusedRef = useRef(false);
  const endPhotoSelectionRequestRef = useRef<EndPhotoSelectionRequest | null>(
    null,
  );
  const selectedEndPhotosRef = useRef<SessionPhoto[] | null>(null);
  const preparedEndImagesRef = useRef<File[] | null>(null);
  const shouldExitAfterResultRef = useRef(false);
  const appliedInitialGuideFeedIdRef = useRef<string | null>(null);
  const cameraGuide = useCameraGuideController({
    cameraActive:
      cameraMode === "VISION_CAMERA" &&
      isCameraPageFocused &&
      isVisionCameraActive &&
      isVisionCameraRunning,
    geometry: cameraGeometry,
  });
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
  const openConfirm = useConfirm();

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
    cameraGuide.selectGuide(initialGuideSelection);
  }, [cameraGuide.selectGuide, initialGuideFeedId, initialGuideSelection]);

  useEffect(() => {
    return () => {
      endPhotoSelectionRequestRef.current?.reject(
        new Error("화면을 벗어나 사진 선택이 취소되었습니다."),
      );
      endPhotoSelectionRequestRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!shouldRestoreJoinSheet) return;

    setJoinInitialCode(returnJoinCode);
    setIsJoinSheetOpen(true);
  }, [returnJoinCode, shouldRestoreJoinSheet]);

  useFocusEffect(
    useCallback(() => {
      isCameraPageFocusedRef.current = true;
      setIsCameraPageFocused(true);

      if (cameraMode === "VISION_CAMERA") {
        setIsVisionCameraActive(true);
      }

      return () => {
        isCameraPageFocusedRef.current = false;
        setIsCameraPageFocused(false);
        // Tab/Stack에 화면 instance가 남아 있어도 카메라 session이
        // background에서 계속 실행되지 않도록 focus 수명에 묶습니다.
        setIsVisionCameraActive(false);
      };
    }, [cameraMode]),
  );

  const roomId = hostSession?.roomId ?? "";
  const { data: roomData } = rtcHostQuery.useReadRtcRoom(roomId, {
    enabled: Boolean(hostSession) && isCameraPageFocused,
    refetchInterval: false,
  });
  useRtcRoomEvents({
    roomId,
    enabled: Boolean(hostSession) && isCameraPageFocused,
  });
  const participants = roomData?.participants ?? [];
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

  const handleVisionCameraStopped = () => {
    isVisionCameraRunningRef.current = false;
    setIsVisionCameraRunning(false);
  };

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

  const handleOpenShare = async () => {
    if (createRoomMutation.isPending) return;

    const confirmed = await openConfirm({
      title: "실시간 공유를 시작할까요?",
      message: "촬영 화면이 참여자에게 실시간으로 공유됩니다.",
      confirmText: "공유 준비하기",
      cancelText: "취소",
    });
    if (!confirmed) return;

    try {
      setIsJoinSheetOpen(false);
      await createRoomMutation.mutateAsync({
        expiresInMinutes: RTC_HOST_ROOM_EXPIRES_IN_MINUTES,
      });
      setCapturedPhotos([]);
      selectedEndPhotosRef.current = null;
      preparedEndImagesRef.current = null;
      setIsShareSheetOpen(true);
    } catch (error) {
      Alert.alert("RTC 방 생성 실패", getErrorMessage(error));
    }
  };

  const handleRequestEndRoom = useCallback(
    async (exitAfterResult = false) => {
      if (!broadcastConnection || isRtcFinalizationPending(finalizationState)) {
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
      setEndRequestId((current) => current + 1);
    },
    [broadcastConnection, finalizationState, openConfirm],
  );

  const handleOpenJoinSheet = () => {
    setJoinInitialCode(undefined);
    setIsJoinSheetOpen(true);
    router.setParams({
      [RTC_NAVIGATION.params.joinSheet]: RTC_NAVIGATION.values.joinSheetOpen,
    });
  };

  const handleCloseJoinSheet = () => {
    setIsJoinSheetOpen(false);
    setJoinInitialCode(undefined);

    if (shouldRestoreJoinSheet) {
      router.replace(RTC_NAVIGATION.paths.camera);
    }
  };

  const handleCancelShare = async () => {
    if (!hostSession || endRoomMutation.isPending) return;

    try {
      await endRoomMutation.mutateAsync({
        roomId: hostSession.roomId,
      });
      clearHostSession();
      selectedEndPhotosRef.current = null;
      preparedEndImagesRef.current = null;
      setIsShareSheetOpen(false);
    } catch (error) {
      Alert.alert("RTC 방 종료 실패", getErrorMessage(error));
    }
  };

  const handleStartShare = async () => {
    if (
      !hostSession ||
      createHostTokenMutation.isPending ||
      broadcastConnection
    ) {
      return;
    }
    if (!isCameraPageFocusedRef.current || !isVisionCameraRunningRef.current) {
      Alert.alert("카메라 준비 중", "카메라가 시작된 뒤 다시 공유해주세요.");
      return;
    }

    try {
      const response = await createHostTokenMutation.mutateAsync({
        roomId: hostSession.roomId,
      });
      if (
        !isCameraPageFocusedRef.current ||
        !isVisionCameraRunningRef.current
      ) {
        Alert.alert(
          "카메라 상태 변경",
          "카메라가 중지되어 LiveKit 송출을 시작하지 않았습니다.",
        );
        return;
      }
      const connection: RtcLiveKitConnection = {
        url: response.url,
        token: response.token,
      };

      // VisionCamera는 그대로 실행됩니다. HOST RTC 계층은 같은
      // CameraSession의 FrameOutput으로 만든 외부 track만 publish합니다.
      setBroadcastConnection(connection);
      setIsShareSheetOpen(false);
    } catch (error) {
      Alert.alert("실시간 공유 시작 실패", getErrorMessage(error));
    }
  };

  const handlePrepareEndRoom = async (): Promise<void> => {
    if (!hostSession) {
      throw new Error("RTC 방 정보가 없습니다. 방 종료를 다시 시도해주세요.");
    }

    if (preparedEndImagesRef.current) return;

    if (!selectedEndPhotosRef.current) {
      const selectedPhotos = await new Promise<SessionPhoto[]>(
        (resolve, reject) => {
          endPhotoSelectionRequestRef.current = {
            resolve,
            reject,
          };
          setIsEndPhotoSelectionOpen(true);
        },
      );
      selectedEndPhotosRef.current = selectedPhotos;
    }

    preparedEndImagesRef.current = await prepareRtcEndImages(
      selectedEndPhotosRef.current,
    );
  };

  const handleEndRoom = async (): Promise<RtcEndRoomResponse> => {
    if (!hostSession) {
      throw new Error("RTC 방 정보가 없습니다. 방 종료를 다시 시도해주세요.");
    }
    if (!preparedEndImagesRef.current) {
      throw new Error("방에 저장할 사진 준비를 완료하지 못했습니다.");
    }

    try {
      return await endRoomMutation.mutateAsync({
        roomId: hostSession.roomId,
        request:
          preparedEndImagesRef.current.length > 0
            ? { images: preparedEndImagesRef.current }
            : undefined,
      });
    } catch (error) {
      throw new Error(
        getApiErrorMessage(
          error,
          "사진 저장 및 RTC 방 종료 요청에 실패했습니다. 종료 처리를 다시 시도해주세요.",
        ),
      );
    }
  };

  const handleConfirmEndPhotoSelection = (selectedPhotos: SessionPhoto[]) => {
    const request = endPhotoSelectionRequestRef.current;
    if (!request) return;

    endPhotoSelectionRequestRef.current = null;
    selectedEndPhotosRef.current = selectedPhotos;
    preparedEndImagesRef.current = null;
    setIsEndPhotoSelectionOpen(false);
    request.resolve(selectedPhotos);
  };

  const handleHostStopped = async (result: RtcEndRoomResponse) => {
    const savedImages = result.savedImages.map(({ id, url }) => ({
      id,
      imageUrl: url,
    }));
    const localImages = (selectedEndPhotosRef.current ?? []).map(
      ({ id, uri }) => ({
        id,
        imageUrl: uri,
      }),
    );

    clearHostSession();
    setBroadcastConnection(null);
    setFinalizationState("IDLE");
    setEndRequestId(0);
    setIsGuideSheetOpen(false);
    setIsCapturedPhotosOpen(false);
    selectedEndPhotosRef.current = null;
    preparedEndImagesRef.current = null;
    isVisionCameraRunningRef.current = false;
    setIsVisionCameraRunning(false);
    setIsVisionCameraActive(false);
    setResultImages(savedImages.length > 0 ? savedImages : localImages);
    setCameraMode("RESULT");

    if (savedImages.length > 0) {
      try {
        await resetMyRtcStoredPhotos();
      } catch {
        Alert.alert(
          "촬영 사진 목록 갱신 실패",
          "사진은 저장됐지만 프로필 목록을 갱신하지 못했습니다. 프로필에서 다시 시도해주세요.",
        );
      }
    }
  };

  const handleCloseResult = () => {
    const shouldExit = shouldExitAfterResultRef.current;
    shouldExitAfterResultRef.current = false;
    setResultImages(null);
    setCapturedPhotos([]);
    selectedEndPhotosRef.current = null;
    preparedEndImagesRef.current = null;
    isVisionCameraRunningRef.current = false;
    setIsVisionCameraRunning(false);
    setCameraMode("VISION_CAMERA");

    if (shouldExit) {
      router.back();
      return;
    }

    setIsVisionCameraActive(true);
  };

  const handleRequestCameraExit = useCallback(() => {
    if (!broadcastConnection) {
      router.back();
      return;
    }

    void handleRequestEndRoom(true);
  }, [broadcastConnection, handleRequestEndRoom]);

  usePreventRemove(
    Boolean(broadcastConnection) || isFinalizationBlocking,
    () => {
      if (!isFinalizationBlocking) handleRequestCameraExit();
    },
  );

  useEffect(() => {
    if (!broadcastConnection && !isFinalizationBlocking) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!isFinalizationBlocking) handleRequestCameraExit();
        return true;
      },
    );

    return () => subscription.remove();
  }, [broadcastConnection, handleRequestCameraExit, isFinalizationBlocking]);

  const handlePhotoLimitReached = useCallback((maxPhotos: number) => {
    Alert.alert(
      "사진 촬영 한도",
      `한 방에서 사진은 최대 ${maxPhotos}장까지 촬영할 수 있습니다.`,
    );
  }, []);

  const handleSelectGuide = useCallback(
    (selection: Parameters<typeof cameraGuide.selectGuide>[0]) => {
      if (initialGuideFeedId) {
        appliedInitialGuideFeedIdRef.current = initialGuideFeedId;
      }
      setIsGuideReferenceVisible(false);
      cameraGuide.selectGuide(selection);
    },
    [cameraGuide.selectGuide, initialGuideFeedId],
  );

  const handleOpenGuideSheet = useCallback(() => {
    setIsGuideSheetOpen(true);
  }, []);

  const handleClearGuide = useCallback(() => {
    setIsGuideReferenceVisible(false);
    cameraGuide.clearGuide();
  }, [cameraGuide.clearGuide]);

  const handleToggleGuideReference = useCallback(() => {
    setIsGuideReferenceVisible((visible) => !visible);
  }, []);

  const handleRetryGuide = useCallback(() => {
    if (hasInitialGuideError) {
      void refetchInitialGuide();
      return;
    }
    cameraGuide.retrySelectedGuide();
  }, [
    cameraGuide.retrySelectedGuide,
    hasInitialGuideError,
    refetchInitialGuide,
  ]);

  if (cameraMode === "RESULT" && resultImages) {
    return (
      <SharingResultPage images={resultImages} onDone={handleCloseResult} />
    );
  }

  return (
    <>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <VStack className="h-full">
          <Camera
            isActive={isVisionCameraActive}
            onClose={handleRequestCameraExit}
            renderHeader={({ onOpenSettings, presentation }) => (
              <CameraHeader
                presentation={presentation}
                onBackPress={handleRequestCameraExit}
                onSettingsPress={onOpenSettings}
                rtcControl={
                  <RtcCameraRoomMenu
                    appearance={presentation}
                    participants={participants}
                    isLive={Boolean(broadcastConnection)}
                    isBusy={
                      createRoomMutation.isPending ||
                      createHostTokenMutation.isPending ||
                      endRoomMutation.isPending ||
                      isRtcFinalizationPending(finalizationState)
                    }
                    isCameraReady={isVisionCameraRunning}
                    onSharePress={() => void handleOpenShare()}
                    onJoinPress={handleOpenJoinSheet}
                    onEndRoomPress={() => void handleRequestEndRoom(false)}
                  />
                }
              />
            )}
            onStarted={() => {
              isVisionCameraRunningRef.current = true;
              setIsVisionCameraRunning(true);
            }}
            onStopped={handleVisionCameraStopped}
            photos={capturedPhotos}
            maxPhotos={RTC_MAX_CAPTURED_PHOTOS}
            onPhotoTaken={(photo) =>
              setCapturedPhotos((previous) =>
                previous.length >= RTC_MAX_CAPTURED_PHOTOS
                  ? previous
                  : [...previous, photo],
              )
            }
            onPhotoLimitReached={handlePhotoLimitReached}
            onOpenPhotos={() => setIsCapturedPhotosOpen(true)}
            videoFrameSink={visionCameraRtcFrameSink}
            poseFrameSink={cameraGuide.poseDetection.frameSink}
            guideAspectRatio={cameraGuide.presentedGuide?.cameraAspectRatio}
            onRuntimeGeometryChange={handleCameraGeometryChange}
            previewOverlay={
              <>
                <FramingGridOverlay />
                {cameraGeometry &&
                cameraGuide.presentedGuide?.outline &&
                cameraGeometry.aspectRatio ===
                  cameraGuide.presentedGuide.cameraAspectRatio ? (
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
                    active={isCameraPageFocused && isVisionCameraActive}
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
                onOpen={handleOpenGuideSheet}
                onRetry={handleRetryGuide}
                onToggleReference={handleToggleGuideReference}
              />
            )}
          />
        </VStack>
      </SafeAreaView>

      <GuideFeedBottomSheet
        open={isGuideSheetOpen}
        selectedFeedId={cameraGuide.selectedGuide?.feedId}
        onSelect={handleSelectGuide}
        onClear={handleClearGuide}
        onClose={() => setIsGuideSheetOpen(false)}
      />

      {broadcastConnection ? (
        <RtcHostLiveKit
          connection={broadcastConnection}
          isActive={isCameraPageFocused && isVisionCameraActive}
          onPrepareEndRoom={handlePrepareEndRoom}
          onEndRoom={handleEndRoom}
          onStopped={handleHostStopped}
          endRequestId={endRequestId}
          onFinalizationStateChange={setFinalizationState}
        />
      ) : null}

      <RtcJoinSheet
        open={isJoinSheetOpen}
        initialCode={joinInitialCode}
        onClose={handleCloseJoinSheet}
      />

      {isShareSheetOpen && hostSession ? (
        <RtcSharingSheet
          joinCode={hostSession.joinCode}
          qrValue={qrValue}
          participantCount={participants.length}
          canStart={isVisionCameraRunning}
          isStarting={
            createHostTokenMutation.isPending || endRoomMutation.isPending
          }
          onCancel={() => void handleCancelShare()}
          onStart={() => void handleStartShare()}
        />
      ) : null}

      {isEndPhotoSelectionOpen ? (
        <Box
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 50,
          }}
        >
          <RtcEndPhotoSelection
            photos={capturedPhotos}
            onConfirm={handleConfirmEndPhotoSelection}
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
}
