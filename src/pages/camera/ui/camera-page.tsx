import { VStack } from "@shared/ui";
import { Camera } from "@widgets/camera";
import { SafeAreaView } from "react-native-safe-area-context";

export function CameraPage() {
  console.log("CameraPage");

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <VStack className="h-full">
        <Camera />
      </VStack>
    </SafeAreaView>
  );
}
