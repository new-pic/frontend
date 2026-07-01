import { Button, ButtonText, Text, VStack } from "@shared/ui";
import { router } from "expo-router";
import { useState } from "react";
import {
  Camera,
  CameraPosition,
  CommonResolutions,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from "react-native-vision-camera";

// 💡 1. 실제 카메라와 무거운 훅들을 담당하는 내부 컴포넌트
function CameraView() {
  const [cameraDevice] = useState<CameraPosition>("back");
  const device = useCameraDevice(cameraDevice);

  // ⭐️ 권한이 허용된 상태에서만 이 훅이 실행되므로 절대 먹통이 되지 않습니다.
  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.UHD_16_9,
  });

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
    <Camera
      style={{ flex: 1 }}
      isActive={true}
      device={device}
      outputs={[photoOutput]}
    />
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
