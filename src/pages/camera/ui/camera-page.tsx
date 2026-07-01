import { CustomCamera } from "@widgets/camera";
import { Text, VStack } from "@shared/ui";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  CameraPosition,
  CommonResolutions,
  useCameraDevice,
  usePhotoOutput,
} from "react-native-vision-camera";

export function CameraPage() {
  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.UHD_16_9,
  });
  // 전면 카메라, 후면 카메라 선택 상태
  const [cameraDevice, setCameraDevice] = useState<CameraPosition>("back");
  const device = useCameraDevice(cameraDevice);

  return (
    <SafeAreaView>
      <VStack className="h-full px-8 py-4"></VStack>
      <CustomCamera device={device} photoOutput={photoOutput} />
    </SafeAreaView>
  );
}
