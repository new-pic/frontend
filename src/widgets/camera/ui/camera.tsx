import { Button, ButtonText, Text, VStack } from "@shared/ui";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  Camera,
  CameraPosition,
  CameraRef,
  CommonResolutions,
  FlashMode,
  Size,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from "react-native-vision-camera";
import { SessionPhoto } from "../model/models";
import { CameraControls } from "./camera-controls";
import { CameraHeader } from "./camera-header";
import { ZoomControls } from "./zoom-control";

// 실제 카메라와 무거운 훅들을 담당하는 내부 컴포넌트
function CameraView() {
  const cameraRef = useRef<CameraRef>(null);

  const [images, setImages] = useState<SessionPhoto[]>([]);
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [targetResolution, setTargetResolution] = useState<Size>(
    CommonResolutions.UHD_16_9,
  );
  const [aspectRatio, setAspectRatio] = useState(
    targetResolution.width / targetResolution.height,
  );

  const [cameraDevice, setCameraDevice] = useState<CameraPosition>("back");
  const device = useCameraDevice(cameraDevice, {
    physicalDevices: ["ultra-wide-angle", "wide-angle", "telephoto"],
  });

  const photoOutput = usePhotoOutput({
    targetResolution,
  });

  /**
   * @description 카메라 전후면 전환
   * - 카메라 전후면 전환은 device를 바꾸는 방식으로 구현
   * - device를 바꾸면 Camera 컴포넌트가 알아서 재렌더링
   */
  const handleChangePosition = () => {
    if (cameraDevice === "back") {
      setCameraDevice("front");
    } else {
      setCameraDevice("back");
    }
  };

  /**
   * @description 플래시 모드 전환
   * - 플래시 모드는 off -> on -> auto 순으로 전환
   * - Camera 컴포넌트에 flashMode prop을 전달하여 적용
   */
  const handleChangeFlashMode = () => {
    switch (flashMode) {
      case "off":
        setFlashMode("on");
        break;
      case "on":
        setFlashMode("auto");
        break;
      case "auto":
        setFlashMode("off");
        break;
    }
  };

  /**
   * @description 사진 촬영
   * - photoOutput.capturePhoto()를 사용하여 사진 촬영
   * - 촬영된 사진은 Image 타입으로 변환 후 images state에 추가
   */
  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await photoOutput.capturePhotoToFile({ flashMode }, {});
      setImages((prev) => [
        ...prev,
        { id: Date.now().toString(), uri: photo.filePath },
      ]);
      console.log("Photo taken:", photo.filePath);
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  useEffect(() => {
    return () => {
      setImages([]);
    };
  }, []);

  if (!device) {
    return (
      <VStack className="h-full items-center justify-center bg-black">
        <Text className="text-white">카메라를 사용할 수 없습니다.</Text>
        <Text className="text-sm text-gray-400">
          실제 기기에서 실행해주세요.
        </Text>
        <Button onPress={() => router.back()} className="mt-4">
          <ButtonText>돌아가기</ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <VStack className="h-full bg-white">
      <CameraHeader onChangeFlashMode={handleChangeFlashMode} />
      <VStack className="flex-1 justify-center">
        <VStack className="h-fit relative">
          <Camera
            ref={cameraRef}
            style={{ aspectRatio }}
            resizeMode="contain"
            isActive={true}
            enableNativeZoomGesture={true}
            device={device}
            outputs={[photoOutput]}
          />
          <ZoomControls />
        </VStack>
      </VStack>
      <CameraControls
        thumbnail={images.length > 0 ? images[images.length - 1] : null}
        onTakePhoto={handleTakePhoto}
        onChangePosition={handleChangePosition}
      />
    </VStack>
  );
}

export function CustomCamera() {
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

  return <CameraView />;
}
