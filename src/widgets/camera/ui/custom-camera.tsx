import {
  Button,
  ButtonIcon,
  ButtonText,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import {
  IconBolt,
  IconCameraRotate,
  IconChevronLeft,
} from "@tabler/icons-react-native";
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

function CameraHeader() {
  const handleGoBack = () => {
    router.back();
  };
  return (
    <HStack className="py-3 px-6 justify-between">
      <Button variant="ghost" size="icon" onPress={handleGoBack}>
        <ButtonIcon as={IconChevronLeft} />
      </Button>
      <HStack space="md">
        <Button variant="gradient" className="w-35 p-0">
          <ButtonText>실시간 공유하기</ButtonText>
        </Button>
        <Button variant="ghost" size="icon" className="w-7 h-7">
          <ButtonIcon className="w-7 h-7" as={IconBolt} />
        </Button>
      </HStack>
    </HStack>
  );
}

interface CameraControlsProps {
  onChangePosition: () => void;
}
function CameraControls({ onChangePosition }: CameraControlsProps) {
  return (
    <VStack className="w-full py-8 px-6">
      <HStack className="items-center justify-around">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onPress={onChangePosition}
        >
          <ButtonIcon className="w-7 h-7" as={IconBolt} />
        </Button>
        <Button variant="outline" className="w-20 h-20 rounded-full"></Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10"
          onPress={onChangePosition}
        >
          <ButtonIcon className="w-10 h-10" as={IconCameraRotate} />
        </Button>
      </HStack>
    </VStack>
  );
}

// 💡 1. 실제 카메라와 무거운 훅들을 담당하는 내부 컴포넌트
function CameraView() {
  const [cameraDevice, setCameraDevice] = useState<CameraPosition>("back");
  const device = useCameraDevice(cameraDevice, {
    physicalDevices: ["ultra-wide-angle", "wide-angle", "telephoto"],
  });

  // ⭐️ 권한이 허용된 상태에서만 이 훅이 실행되므로 절대 먹통이 되지 않습니다.
  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.UHD_16_9,
  });

  const handleChangePosition = () => {
    if (cameraDevice === "back") {
      setCameraDevice("front");
    } else {
      setCameraDevice("back");
    }
  };

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
      <CameraHeader />
      <Camera
        style={{ flex: 1 }}
        isActive={true}
        enableNativeZoomGesture={true}
        device={device}
        outputs={[photoOutput]}
      />
      <CameraControls onChangePosition={handleChangePosition} />
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
