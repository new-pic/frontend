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
  CameraController,
  CameraDevice,
  CameraPosition,
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
  DEFAULT_CAMERA_CAPTURE_SETTINGS,
  getEffectivePhotoFlashMode,
  getNextPhotoFlashMode,
  getPhotoTargetResolution,
  getPortraitPreviewAspectRatio,
  isResolutionMatchingAspectRatio,
} from "../lib";
import type {
  CameraAspectRatio,
  CameraCaptureSettings,
  CameraPhotoFlashMode,
  SessionPhoto,
} from "../model/models";
import { CameraAspectRatioControl } from "./camera-aspect-ratio-control";
import { CameraControls } from "./camera-controls";
import { ZoomControls } from "./zoom-control";

const DEFAULT_DISPLAY_ZOOM = 1;
const MAX_PINCH_ZOOM = 15;
const ZOOM_BUTTON_LEVELS = [0.5, 1, 2] as const;
const ZOOM_EPSILON = 0.01;

function clampZoom(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundDisplayZoom(value: number) {
  "worklet";
  return Math.round(value * 10) / 10;
}

/**
 * CameraController가 사용하는 raw zoom과 사용자에게 보여줄 배율은
 * iOS virtual camera/Android logical camera에서 다를 수 있습니다.
 */
function getDisplayZoomMultiplier(
  controller: CameraController,
  device: CameraDevice,
) {
  const controllerMultiplier =
    controller.zoom > 0
      ? controller.displayableZoomFactor / controller.zoom
      : 1;

  if (
    Number.isFinite(controllerMultiplier) &&
    controllerMultiplier > 0 &&
    Math.abs(controllerMultiplier - 1) > ZOOM_EPSILON
  ) {
    return controllerMultiplier;
  }

  // iOS 18 미만에서는 displayableZoomFactor가 raw zoom을 그대로
  // 반환하므로 ultra-wide → wide 전환 지점을 1x 기준으로 사용합니다.
  const firstLensSwitchFactor = device.zoomLensSwitchFactors[0];
  const hasUltraWideCamera = device.physicalDevices.some(
    (physicalDevice) => physicalDevice.type === "ultra-wide-angle",
  );

  if (
    device.isVirtualDevice &&
    hasUltraWideCamera &&
    firstLensSwitchFactor !== undefined &&
    firstLensSwitchFactor > 1
  ) {
    return 1 / firstLensSwitchFactor;
  }

  return Number.isFinite(controllerMultiplier) && controllerMultiplier > 0
    ? controllerMultiplier
    : 1;
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
  flashMode: CameraPhotoFlashMode;
  isFlashAvailable: boolean;
  onChangeFlashMode: () => void;
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
  videoFrameSink?: NativeCameraFrameSink;
  poseFrameSink?: NativeCameraFrameSink;
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
  videoFrameSink,
  poseFrameSink,
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
  const [isPhotoOutputConfigured, setIsPhotoOutputConfigured] =
    useState(false);
  const targetResolution = getPhotoTargetResolution(
    captureSettings.aspectRatio,
  );
  const previewAspectRatio = getPortraitPreviewAspectRatio(
    captureSettings.aspectRatio,
  );

  const [cameraDevice, setCameraDevice] = useState<CameraPosition>("back");
  const device = useCameraDevice(cameraDevice, {
    physicalDevices: ["ultra-wide-angle", "wide-angle", "telephoto"],
  });
  const hasPhysicalFlash = device?.hasFlash ?? false;
  const initialMinZoom = device?.minZoom ?? DEFAULT_DISPLAY_ZOOM;
  const initialMaxZoom = Math.max(
    initialMinZoom,
    Math.min(device?.maxZoom ?? MAX_PINCH_ZOOM, MAX_PINCH_ZOOM),
  );
  const initialZoom = clampZoom(
    DEFAULT_DISPLAY_ZOOM,
    initialMinZoom,
    initialMaxZoom,
  );

  const zoom = useSharedValue(initialZoom);
  const pinchStartZoom = useSharedValue(initialZoom);
  const minZoom = useSharedValue(initialMinZoom);
  const maxZoom = useSharedValue(initialMaxZoom);
  const displayZoomMultiplier = useSharedValue(1);
  const configuredZoomDeviceIdRef = useRef<string | null>(null);

  const [displayZoom, setDisplayZoom] = useState(
    roundDisplayZoom(initialZoom),
  );
  const [displayZoomRange, setDisplayZoomRange] = useState({
    min: initialMinZoom,
    max: initialMaxZoom,
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
        videoFrameSink?.pushFrame(frame);
        poseFrameSink?.pushFrame(frame);
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

  useEffect(() => {
    if (!device) return;

    const nextMinZoom = device.minZoom;
    const nextMaxZoom = Math.max(
      nextMinZoom,
      Math.min(device.maxZoom, MAX_PINCH_ZOOM),
    );
    const nextZoom = clampZoom(
      DEFAULT_DISPLAY_ZOOM,
      nextMinZoom,
      nextMaxZoom,
    );

    configuredZoomDeviceIdRef.current = null;
    minZoom.value = nextMinZoom;
    maxZoom.value = nextMaxZoom;
    displayZoomMultiplier.value = 1;
    zoom.value = nextZoom;
    pinchStartZoom.value = nextZoom;
    setDisplayZoomRange({ min: nextMinZoom, max: nextMaxZoom });
    setDisplayZoom(roundDisplayZoom(nextZoom));
  }, [
    device,
    displayZoomMultiplier,
    maxZoom,
    minZoom,
    pinchStartZoom,
    zoom,
  ]);

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

  const handleCameraStarted = useCallback(() => {
    const controller = cameraRef.current?.controller;

    if (controller && device) {
      const nextMinZoom = controller.minZoom;
      const nextMaxZoom = Math.max(
        nextMinZoom,
        Math.min(controller.maxZoom, MAX_PINCH_ZOOM),
      );
      const nextDisplayZoomMultiplier = getDisplayZoomMultiplier(
        controller,
        device,
      );
      const minDisplayZoom = nextMinZoom * nextDisplayZoomMultiplier;
      const maxDisplayZoom = nextMaxZoom * nextDisplayZoomMultiplier;
      const isNewDevice =
        configuredZoomDeviceIdRef.current !== device.id;
      const preferredDisplayZoom = isNewDevice
        ? DEFAULT_DISPLAY_ZOOM
        : zoom.value * nextDisplayZoomMultiplier;
      const nextDisplayZoom = clampZoom(
        preferredDisplayZoom,
        minDisplayZoom,
        maxDisplayZoom,
      );
      const nextZoom = clampZoom(
        nextDisplayZoom / nextDisplayZoomMultiplier,
        nextMinZoom,
        nextMaxZoom,
      );

      configuredZoomDeviceIdRef.current = device.id;
      minZoom.value = nextMinZoom;
      maxZoom.value = nextMaxZoom;
      displayZoomMultiplier.value = nextDisplayZoomMultiplier;
      zoom.value = nextZoom;
      pinchStartZoom.value = nextZoom;
      setDisplayZoomRange({
        min: minDisplayZoom,
        max: maxDisplayZoom,
      });
      setDisplayZoom(roundDisplayZoom(nextDisplayZoom));
    }

    onStarted?.();
  }, [
    device,
    displayZoomMultiplier,
    maxZoom,
    minZoom,
    onStarted,
    pinchStartZoom,
    zoom,
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
    const supportedLevels = ZOOM_BUTTON_LEVELS.filter(
      (level) =>
        level >= displayZoomRange.min - ZOOM_EPSILON &&
        level <= displayZoomRange.max + ZOOM_EPSILON,
    );

    if (supportedLevels.length > 0) return supportedLevels;

    return [
      roundDisplayZoom(
        clampZoom(
          DEFAULT_DISPLAY_ZOOM,
          displayZoomRange.min,
          displayZoomRange.max,
        ),
      ),
    ];
  }, [displayZoomRange]);

  const handleZoomChange = useCallback(
    (nextDisplayZoom: number) => {
      const multiplier = displayZoomMultiplier.value;
      if (!Number.isFinite(multiplier) || multiplier <= 0) return;

      const nextZoom = clampZoom(
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
    minZoom.value = DEFAULT_DISPLAY_ZOOM;
    maxZoom.value = DEFAULT_DISPLAY_ZOOM;
    displayZoomMultiplier.value = 1;
    zoom.value = DEFAULT_DISPLAY_ZOOM;
    pinchStartZoom.value = DEFAULT_DISPLAY_ZOOM;
    setDisplayZoomRange({
      min: DEFAULT_DISPLAY_ZOOM,
      max: DEFAULT_DISPLAY_ZOOM,
    });
    setDisplayZoom(DEFAULT_DISPLAY_ZOOM);
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
  const handleChangeFlashMode = () => {
    setCaptureSettings((currentSettings) => ({
      ...currentSettings,
      flashMode: getNextPhotoFlashMode(
        currentSettings.flashMode,
        hasPhysicalFlash,
      ),
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
    <VStack className="h-full bg-white">
      {renderHeader?.({
        flashMode: captureSettings.flashMode,
        isFlashAvailable: hasPhysicalFlash,
        onChangeFlashMode: handleChangeFlashMode,
      })}
      <VStack className="flex-1 justify-center">
        <VStack className="h-fit relative">
          <GestureDetector gesture={pinchGesture}>
            <View
              collapsable={false}
              style={{
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
              <CameraAspectRatioControl
                aspectRatio={captureSettings.aspectRatio}
                disabled={!isPhotoOutputConfigured}
                onChange={handleChangeAspectRatio}
              />
            </View>
          </GestureDetector>
          <ZoomControls
            zoomLevel={displayZoom}
            zoomLevels={zoomButtonLevels}
            onZoomChange={handleZoomChange}
          />
        </VStack>
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
      />
    </VStack>
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
  videoFrameSink,
  poseFrameSink,
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
      videoFrameSink={videoFrameSink}
      poseFrameSink={poseFrameSink}
    />
  );
}
