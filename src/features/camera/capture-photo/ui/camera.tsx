import { Button, ButtonText, Text, VStack } from "@shared/ui";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { HybridObject } from "react-native-nitro-modules";
import {
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import {
  Camera,
  CameraRef,
  CommonResolutions,
  Constraint,
  Frame,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
  usePhotoOutput,
} from "react-native-vision-camera";
import {
  type CameraChromePresentation,
  clampCameraZoom,
  createCameraZoomConfiguration,
  DEFAULT_CAMERA_CAPTURE_SETTINGS,
  DEFAULT_CAMERA_DISPLAY_ZOOM,
  getEffectivePhotoFlashMode,
  getPhotoTargetResolution,
  getPortraitPreviewAspectRatio,
  getSupportedCameraZoomLevels,
  isResolutionMatchingAspectRatio,
  orientCameraResolution,
  resolveCameraDisplayZoomMultiplier,
  resolveCameraChromePresentation,
  resolveCameraStageAlignment,
} from "../lib";
import type {
  CameraAspectRatio,
  CameraCaptureSettings,
  CameraPhotoFlashMode,
  CameraRuntimeGeometry,
  SessionPhoto,
} from "../model/models";
import { CameraControls } from "./camera-controls";
import { CameraSettingsBottomSheet } from "./camera-settings-bottom-sheet";
import { ZoomControls } from "./zoom-control";

const MAX_PINCH_ZOOM = 15;

function roundDisplayZoom(value: number) {
  "worklet";
  return Math.round(value * 10) / 10;
}

/**
 * RTC 송출이나 Pose 처리를 연결할 때 사용하는 worklet-safe native
 * 확장점입니다.
 *
 * 일반 JS callback을 전달하면 Camera thread에서 호출할 수 없습니다.
 * Nitro HybridObject처럼 Worklet에서 동기 호출 가능한 객체만 전달해야 합니다.
 */
export interface NativeCameraFrameSink
  extends HybridObject<{ ios: "swift"; android: "kotlin" }> {
  pushFrame(frame: Frame): boolean | void;
}

export interface CameraHeaderRenderProps {
  onOpenSettings: () => void;
  presentation: CameraChromePresentation;
}

export interface CameraStageRenderProps {
  presentation: CameraChromePresentation;
}

interface CustomCameraProps {
  renderHeader?: (props: CameraHeaderRenderProps) => ReactNode;
  onClose?: () => void;
  isActive?: boolean;
  onStarted?: () => void;
  onStopped?: () => void;
  photos?: SessionPhoto[];
  maxPhotos?: number;
  onPhotoTaken?: (photo: SessionPhoto) => void;
  onPhotoLimitReached?: (maxPhotos: number) => void;
  onOpenPhotos?: () => void;
  videoFrameSink?: NativeCameraFrameSink;
  poseFrameSink?: NativeCameraFrameSink;
  guideAspectRatio?: CameraAspectRatio;
  previewOverlay?: ReactNode;
  previewControl?: ReactNode;
  renderStageControl?: (
    props: CameraStageRenderProps,
  ) => ReactNode;
  onRuntimeGeometryChange?: (
    geometry: CameraRuntimeGeometry | null,
  ) => void;
}

// 실제 카메라와 무거운 훅들을 담당하는 내부 컴포넌트
function CameraView({
  renderHeader,
  onClose,
  isActive = true,
  onStarted,
  onStopped,
  photos,
  maxPhotos,
  onPhotoTaken,
  onPhotoLimitReached,
  onOpenPhotos,
  videoFrameSink,
  poseFrameSink,
  guideAspectRatio,
  previewOverlay,
  previewControl,
  renderStageControl,
  onRuntimeGeometryChange,
}: CustomCameraProps) {
  const cameraRef = useRef<CameraRef>(null);
  const isTakingPhotoRef = useRef(false);

  const [internalPhotos, setInternalPhotos] = useState<SessionPhoto[]>(
    [],
  );
  const sessionPhotos = photos ?? internalPhotos;
  const hasReachedPhotoLimit =
    maxPhotos !== undefined &&
    sessionPhotos.length >= maxPhotos;
  const [captureSettings, setCaptureSettings] =
    useState<CameraCaptureSettings>(
      DEFAULT_CAMERA_CAPTURE_SETTINGS,
    );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPhotoOutputConfigured, setIsPhotoOutputConfigured] =
    useState(false);
  const [previewSize, setPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const targetResolution = getPhotoTargetResolution(
    captureSettings.aspectRatio,
  );
  const previewAspectRatio = getPortraitPreviewAspectRatio(
    captureSettings.aspectRatio,
  );
  const chromePresentation = resolveCameraChromePresentation(
    captureSettings.aspectRatio,
  );
  const stageAlignment = resolveCameraStageAlignment(
    captureSettings.aspectRatio,
  );

  const [cameraDevice, setCameraDevice] = useState<"front" | "back">(
    "back",
  );
  const device = useCameraDevice(cameraDevice, {
    physicalDevices: ["ultra-wide-angle", "wide-angle", "telephoto"],
  });
  const hasPhysicalFlash = device?.hasFlash ?? false;
  const initialMinZoom =
    device?.minZoom ?? DEFAULT_CAMERA_DISPLAY_ZOOM;
  const initialMaxZoom = Math.max(
    initialMinZoom,
    Math.min(device?.maxZoom ?? MAX_PINCH_ZOOM, MAX_PINCH_ZOOM),
  );
  const initialDisplayZoomMultiplier = device
    ? resolveCameraDisplayZoomMultiplier(null, device)
    : 1;
  const initialZoomConfiguration = createCameraZoomConfiguration({
    rawMinZoom: initialMinZoom,
    rawMaxZoom: initialMaxZoom,
    displayZoomMultiplier: initialDisplayZoomMultiplier,
  });

  const zoom = useSharedValue(initialZoomConfiguration.rawZoom);
  const pinchStartZoom = useSharedValue(
    initialZoomConfiguration.rawZoom,
  );
  const minZoom = useSharedValue(initialMinZoom);
  const maxZoom = useSharedValue(initialMaxZoom);
  const displayZoomMultiplier = useSharedValue(
    initialDisplayZoomMultiplier,
  );
  const configuredZoomDeviceIdRef = useRef<string | null>(null);

  const [displayZoom, setDisplayZoom] = useState(
    roundDisplayZoom(initialZoomConfiguration.displayZoom),
  );
  const [displayZoomRange, setDisplayZoomRange] = useState({
    min: initialZoomConfiguration.displayMinZoom,
    max: initialZoomConfiguration.displayMaxZoom,
  });

  const photoOutput = usePhotoOutput({
    targetResolution,
  });
  const frameOutput = useFrameOutput({
    targetResolution: CommonResolutions.HD_16_9,
    pixelFormat: "yuv",
    dropFramesWhileBusy: true,
    enablePhysicalBufferRotation: false,
    onFrame(frame) {
      "worklet";
      try {
        // 미송출 중에는 native sink가 프레임을 보관하지 않고 즉시
        // false를 반환합니다. Frame 소유권은 항상 이 callback에 있습니다.
        try {
          videoFrameSink?.pushFrame(frame);
        } catch {
          // RTC 실패가 Pose 소비와 Frame 해제를 막지 않습니다.
        }
        try {
          poseFrameSink?.pushFrame(frame);
        } catch {
          // Pose 실패가 RTC와 CameraSession을 중단하지 않습니다.
        }
      } finally {
        frame.dispose();
      }
    },
  });
  const cameraOutputs = useMemo(
    () => [photoOutput, frameOutput],
    [frameOutput, photoOutput],
  );
  const cameraConstraints = useMemo<Constraint[]>(
    () => [{ fps: 30 }],
    [],
  );
  const currentPhotoResolution = photoOutput.currentResolution;
  const currentPhotoWidth = currentPhotoResolution?.width;
  const currentPhotoHeight = currentPhotoResolution?.height;
  const photoOutputOrientation = photoOutput.outputOrientation;
  const runtimeGeometry = useMemo<CameraRuntimeGeometry | null>(() => {
    if (
      !isPhotoOutputConfigured ||
      currentPhotoWidth === undefined ||
      currentPhotoHeight === undefined ||
      !previewSize
    ) {
      return null;
    }

    return {
      aspectRatio: captureSettings.aspectRatio,
      captureSize: orientCameraResolution(
        {
          width: currentPhotoWidth,
          height: currentPhotoHeight,
        },
        photoOutputOrientation,
      ),
      previewSize,
      cameraPosition: cameraDevice,
    };
  }, [
    cameraDevice,
    captureSettings.aspectRatio,
    currentPhotoHeight,
    currentPhotoWidth,
    isPhotoOutputConfigured,
    photoOutputOrientation,
    previewSize,
  ]);
  const updateDisplayZoom = useCallback((nextZoom: number) => {
    setDisplayZoom(nextZoom);
  }, []);

  useAnimatedReaction(
    () =>
      roundDisplayZoom(zoom.value * displayZoomMultiplier.value),
    (nextZoom, previousZoom) => {
      if (nextZoom !== previousZoom) {
        scheduleOnRN(updateDisplayZoom, nextZoom);
      }
    },
    [updateDisplayZoom],
  );

  const applyZoomConfiguration = useCallback(
    (
      configuration: ReturnType<
        typeof createCameraZoomConfiguration
      >,
    ) => {
      minZoom.value = configuration.rawMinZoom;
      maxZoom.value = configuration.rawMaxZoom;
      displayZoomMultiplier.value =
        configuration.displayZoomMultiplier;
      zoom.value = configuration.rawZoom;
      pinchStartZoom.value = configuration.rawZoom;
      setDisplayZoomRange({
        min: configuration.displayMinZoom,
        max: configuration.displayMaxZoom,
      });
      setDisplayZoom(roundDisplayZoom(configuration.displayZoom));
    },
    [
      displayZoomMultiplier,
      maxZoom,
      minZoom,
      pinchStartZoom,
      zoom,
    ],
  );

  useEffect(() => {
    if (!device) return;

    const nextMinZoom = device.minZoom;
    const nextMaxZoom = Math.max(
      nextMinZoom,
      Math.min(device.maxZoom, MAX_PINCH_ZOOM),
    );
    const nextDisplayZoomMultiplier =
      resolveCameraDisplayZoomMultiplier(null, device);
    const configuration = createCameraZoomConfiguration({
      rawMinZoom: nextMinZoom,
      rawMaxZoom: nextMaxZoom,
      displayZoomMultiplier: nextDisplayZoomMultiplier,
    });

    configuredZoomDeviceIdRef.current = null;
    applyZoomConfiguration(configuration);
  }, [applyZoomConfiguration, device]);

  useEffect(() => {
    if (device?.hasFlash !== false) return;

    setCaptureSettings((currentSettings) => {
      if (currentSettings.flashMode === "off") {
        return currentSettings;
      }

      return {
        ...currentSettings,
        flashMode: "off",
      };
    });
  }, [device]);

  useEffect(() => {
    if (
      !guideAspectRatio ||
      guideAspectRatio === captureSettings.aspectRatio
    ) {
      return;
    }

    setIsPhotoOutputConfigured(false);
    setCaptureSettings((currentSettings) => ({
      ...currentSettings,
      aspectRatio: guideAspectRatio,
    }));
  }, [captureSettings.aspectRatio, guideAspectRatio]);

  useEffect(() => {
    onRuntimeGeometryChange?.(runtimeGeometry);
  }, [onRuntimeGeometryChange, runtimeGeometry]);

  useEffect(
    () => () => {
      onRuntimeGeometryChange?.(null);
    },
    [onRuntimeGeometryChange],
  );

  const configureZoomForCurrentSession = useCallback(() => {
    const controller = cameraRef.current?.controller;

    if (!controller || !device) return;

    const nextDisplayZoomMultiplier =
      resolveCameraDisplayZoomMultiplier(controller, device);
    const isNewDevice =
      configuredZoomDeviceIdRef.current !== device.id;
    const configuration = createCameraZoomConfiguration({
      rawMinZoom: controller.minZoom,
      rawMaxZoom: Math.min(controller.maxZoom, MAX_PINCH_ZOOM),
      displayZoomMultiplier: nextDisplayZoomMultiplier,
      preferredDisplayZoom: isNewDevice
        ? DEFAULT_CAMERA_DISPLAY_ZOOM
        : zoom.value * nextDisplayZoomMultiplier,
    });

    configuredZoomDeviceIdRef.current = device.id;
    applyZoomConfiguration(configuration);
  }, [applyZoomConfiguration, device, zoom]);

  const handleCameraStarted = useCallback(() => {
    configureZoomForCurrentSession();

    onStarted?.();
  }, [
    configureZoomForCurrentSession,
    onStarted,
  ]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          pinchStartZoom.value = zoom.value;
        })
        .onUpdate((event) => {
          const nextZoom = pinchStartZoom.value * event.scale;
          zoom.value = Math.min(
            maxZoom.value,
            Math.max(minZoom.value, nextZoom),
          );
        }),
    [maxZoom, minZoom, pinchStartZoom, zoom],
  );

  const zoomButtonLevels = useMemo(() => {
    return getSupportedCameraZoomLevels(
      displayZoomRange.min,
      displayZoomRange.max,
    );
  }, [displayZoomRange]);

  const handleZoomChange = useCallback(
    (nextDisplayZoom: number) => {
      const multiplier = displayZoomMultiplier.value;
      if (!Number.isFinite(multiplier) || multiplier <= 0) return;

      const nextZoom = clampCameraZoom(
        nextDisplayZoom / multiplier,
        minZoom.value,
        maxZoom.value,
      );
      zoom.value = withTiming(nextZoom, { duration: 180 });
    },
    [displayZoomMultiplier, maxZoom, minZoom, zoom],
  );

  /**
   * @description 카메라 전후면 전환
   * - 카메라 전후면 전환은 device를 바꾸는 방식으로 구현
   * - device를 바꾸면 Camera 컴포넌트가 알아서 재렌더링
   */
  const handleChangePosition = () => {
    // 이전 카메라의 확대값이 새 카메라 범위를 벗어난 상태로
    // CameraController에 전달되지 않도록 전환 전에 1x로 초기화합니다.
    configuredZoomDeviceIdRef.current = null;
    minZoom.value = DEFAULT_CAMERA_DISPLAY_ZOOM;
    maxZoom.value = DEFAULT_CAMERA_DISPLAY_ZOOM;
    displayZoomMultiplier.value = 1;
    zoom.value = DEFAULT_CAMERA_DISPLAY_ZOOM;
    pinchStartZoom.value = DEFAULT_CAMERA_DISPLAY_ZOOM;
    setDisplayZoomRange({
      min: DEFAULT_CAMERA_DISPLAY_ZOOM,
      max: DEFAULT_CAMERA_DISPLAY_ZOOM,
    });
    setDisplayZoom(DEFAULT_CAMERA_DISPLAY_ZOOM);
    setIsPhotoOutputConfigured(false);

    if (cameraDevice === "back") {
      setCameraDevice("front");
    } else {
      setCameraDevice("back");
    }
  };

  /**
   * @description 플래시 모드 전환
   * - 플래시 모드는 off -> on -> auto 순으로 전환
   * - 촬영 시점의 Photo capture settings에만 전달
   */
  const handleChangeFlashMode = (
    flashMode: CameraPhotoFlashMode,
  ) => {
    setCaptureSettings((currentSettings) => ({
      ...currentSettings,
      flashMode:
        hasPhysicalFlash || flashMode === "off"
          ? flashMode
          : "off",
    }));
  };

  const handleChangeAspectRatio = (
    aspectRatio: CameraAspectRatio,
  ) => {
    if (
      !isPhotoOutputConfigured ||
      captureSettings.aspectRatio === aspectRatio
    ) {
      return;
    }

    setIsPhotoOutputConfigured(false);
    setCaptureSettings((currentSettings) => ({
      ...currentSettings,
      aspectRatio,
    }));
  };

  const handleCameraConfigured = () => {
    const currentResolution = photoOutput.currentResolution;

    if (
      currentResolution &&
      !isResolutionMatchingAspectRatio(
        currentResolution,
        captureSettings.aspectRatio,
      )
    ) {
      console.warn(
        "PhotoOutput resolution differs from the selected aspect ratio.",
        {
          selectedAspectRatio: captureSettings.aspectRatio,
          targetResolution,
          currentResolution,
        },
      );
    }

    setIsPhotoOutputConfigured(true);
    configureZoomForCurrentSession();
  };

  const handleCameraError = (error: Error) => {
    setIsPhotoOutputConfigured(false);
    console.error("Camera error:", error);
  };

  /**
   * @description 사진 촬영
   * - photoOutput.capturePhoto()를 사용하여 사진 촬영
   * - 촬영된 사진은 Image 타입으로 변환 후 images state에 추가
   */
  const handleTakePhoto = async () => {
    if (hasReachedPhotoLimit) {
      if (maxPhotos !== undefined) {
        onPhotoLimitReached?.(maxPhotos);
      }
      return;
    }
    if (
      !cameraRef.current ||
      !isPhotoOutputConfigured ||
      isTakingPhotoRef.current
    ) {
      return;
    }

    isTakingPhotoRef.current = true;
    try {
      const flashMode = getEffectivePhotoFlashMode(
        captureSettings.flashMode,
        hasPhysicalFlash,
      );
      const photo = await photoOutput.capturePhotoToFile(
        { flashMode },
        {},
      );
      const photoUri = photo.filePath.startsWith("file://")
        ? photo.filePath
        : `file://${photo.filePath}`;
      const nextPhoto = {
        id: `${Date.now()}-${sessionPhotos.length}`,
        uri: photoUri,
      };

      if (onPhotoTaken) {
        onPhotoTaken(nextPhoto);
      } else {
        setInternalPhotos((previous) => [
          ...previous,
          nextPhoto,
        ]);
      }

      if (
        maxPhotos !== undefined &&
        sessionPhotos.length + 1 >= maxPhotos
      ) {
        onPhotoLimitReached?.(maxPhotos);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    } finally {
      isTakingPhotoRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      setInternalPhotos([]);
    };
  }, []);

  if (!device) {
    return (
      <VStack className="h-full items-center justify-center bg-black">
        <Text className="text-white">카메라를 사용할 수 없습니다.</Text>
        <Text className="text-sm text-gray-400">
          실제 기기에서 실행해주세요.
        </Text>
        {onClose ? (
          <Button onPress={onClose} className="mt-4">
            <ButtonText>돌아가기</ButtonText>
          </Button>
        ) : null}
      </VStack>
    );
  }

  return (
    <>
      <VStack className="h-full bg-white">
        {renderHeader?.({
          onOpenSettings: () => setIsSettingsOpen(true),
          presentation: chromePresentation,
        })}
        <VStack
          className={`relative flex-1 ${stageAlignment === "center" ? "justify-center bg-black" : "justify-start bg-white"}`}
        >
          <GestureDetector gesture={pinchGesture}>
            <View
              collapsable={false}
              onLayout={({ nativeEvent }) => {
                const { width, height } = nativeEvent.layout;
                setPreviewSize((current) =>
                  current?.width === width &&
                  current.height === height
                    ? current
                    : { width, height },
                );
              }}
              style={{
                width: "100%",
                aspectRatio: previewAspectRatio,
                overflow: "hidden",
              }}
            >
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                isActive={isActive}
                zoom={zoom}
                device={device}
                outputs={cameraOutputs}
                constraints={cameraConstraints}
                onConfigured={handleCameraConfigured}
                onError={handleCameraError}
                onStarted={handleCameraStarted}
                onStopped={onStopped}
              />
              {previewOverlay}
              {previewControl}
            </View>
          </GestureDetector>
          {renderStageControl?.({
            presentation: chromePresentation,
          })}
          <ZoomControls
            zoomLevel={displayZoom}
            zoomLevels={zoomButtonLevels}
            onZoomChange={handleZoomChange}
          />
        </VStack>
        <CameraControls
          thumbnail={
            sessionPhotos.length > 0
              ? sessionPhotos[sessionPhotos.length - 1]
              : null
          }
          isTakePhotoDisabled={
            hasReachedPhotoLimit || !isPhotoOutputConfigured
          }
          onTakePhoto={handleTakePhoto}
          onChangePosition={handleChangePosition}
          onThumbnailPress={
            sessionPhotos.length > 0 ? onOpenPhotos : undefined
          }
        />
      </VStack>

      <CameraSettingsBottomSheet
        open={isSettingsOpen}
        settings={captureSettings}
        isFlashAvailable={hasPhysicalFlash}
        isAspectRatioLocked={guideAspectRatio !== undefined}
        isAspectRatioReady={isPhotoOutputConfigured}
        onClose={() => setIsSettingsOpen(false)}
        onFlashModeChange={handleChangeFlashMode}
        onAspectRatioChange={handleChangeAspectRatio}
      />
    </>
  );
}

export function CustomCamera({
  renderHeader,
  onClose,
  isActive = true,
  onStarted,
  onStopped,
  photos,
  maxPhotos,
  onPhotoTaken,
  onPhotoLimitReached,
  onOpenPhotos,
  videoFrameSink,
  poseFrameSink,
  guideAspectRatio,
  previewOverlay,
  previewControl,
  renderStageControl,
  onRuntimeGeometryChange,
}: CustomCameraProps) {
  const { hasPermission, requestPermission } = useCameraPermission();

  // ⭐️ 권한이 없으면 아래 CameraView(무거운 훅들)를 아예 렌더링하지 않고 여기서 끝냅니다.
  if (!hasPermission) {
    return (
      <VStack className="h-full items-center justify-center bg-white">
        <Text className="mb-4 font-bold text-black">
          카메라 권한이 필요합니다.
        </Text>
        <Button variant="outline" onPress={requestPermission}>
          <ButtonText>권한 승인하기</ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <CameraView
      renderHeader={renderHeader}
      onClose={onClose}
      isActive={isActive}
      onStarted={onStarted}
      onStopped={onStopped}
      photos={photos}
      maxPhotos={maxPhotos}
      onPhotoTaken={onPhotoTaken}
      onPhotoLimitReached={onPhotoLimitReached}
      onOpenPhotos={onOpenPhotos}
      videoFrameSink={videoFrameSink}
      poseFrameSink={poseFrameSink}
      guideAspectRatio={guideAspectRatio}
      previewOverlay={previewOverlay}
      previewControl={previewControl}
      renderStageControl={renderStageControl}
      onRuntimeGeometryChange={onRuntimeGeometryChange}
    />
  );
}
