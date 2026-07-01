import { Button, ButtonText, Text, VStack } from "@shared/ui";
import { router } from "expo-router";
import {
  Camera,
  useCameraDevice,
  usePhotoOutput,
} from "react-native-vision-camera";

interface CustomCameraProps {
  device: ReturnType<typeof useCameraDevice>;
  photoOutput: ReturnType<typeof usePhotoOutput>;
}

export function CustomCamera({ device, photoOutput }: CustomCameraProps) {
  const handleGoBack = () => {
    router.back();
  };
  if (!device) {
    return (
      <VStack className="h-full items-center justify-center">
        <Text>카메라를 사용할 수 없습니다.</Text>
        <Text className="text-sm text-muted-foreground">
          실제 기기에서 실행해주세요.
        </Text>
        <Button onPress={handleGoBack}>
          <ButtonText>돌아가기</ButtonText>
        </Button>
      </VStack>
    );
  }
  return <Camera isActive={true} device={device} outputs={[photoOutput]} />;
}
