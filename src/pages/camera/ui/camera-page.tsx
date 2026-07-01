import { VStack } from "@shared/ui";
import { CustomCamera } from "@widgets/camera";
import { SafeAreaView } from "react-native-safe-area-context";

export function CameraPage() {
  console.log("CameraPage");

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <VStack className="h-full py-4">
        <CustomCamera />
      </VStack>
    </SafeAreaView>
  );
}
