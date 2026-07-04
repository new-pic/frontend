import { Button, ButtonIcon, ButtonText, HStack } from "@shared/ui";
import { IconBolt, IconChevronLeft } from "@tabler/icons-react-native";
import { router } from "expo-router";

interface CameraHeaderProps {
  onChangeFlashMode: () => void;
}

export function CameraHeader({ onChangeFlashMode }: CameraHeaderProps) {
  const handleGoBack = () => {
    router.back();
  };
  return (
    <HStack className="py-3 px-6 justify-between absolute top-0 z-10 w-full">
      <Button variant="ghost" size="icon" onPress={handleGoBack}>
        <ButtonIcon as={IconChevronLeft} />
      </Button>
      <HStack space="md">
        <Button variant="gradient" className="w-35 p-0">
          <ButtonText>실시간 공유하기</ButtonText>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onPress={onChangeFlashMode}
        >
          <ButtonIcon className="w-7 h-7" as={IconBolt} />
        </Button>
      </HStack>
    </HStack>
  );
}
