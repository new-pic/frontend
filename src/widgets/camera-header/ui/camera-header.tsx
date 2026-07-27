import { Button, ButtonIcon, ButtonText, HStack } from "@shared/ui";
import { IconBolt, IconChevronLeft } from "@tabler/icons-react-native";

interface CameraHeaderProps {
  onBackPress: () => void;
  onChangeFlashMode: () => void;
  onSharePress?: () => void;
  onJoinPress?: () => void;
  isCreatingRoom?: boolean;
  isCameraReady?: boolean;
}

export function CameraHeader({
  onBackPress,
  onChangeFlashMode,
  onSharePress,
  onJoinPress,
  isCreatingRoom = false,
  isCameraReady = true,
}: CameraHeaderProps) {
  return (
    <HStack className="absolute top-0 z-10 w-full justify-between px-4 py-3">
      <Button variant="ghost" size="icon" onPress={onBackPress}>
        <ButtonIcon as={IconChevronLeft} />
      </Button>
      <HStack space="sm">
        <Button
          variant="outline"
          className="w-18 bg-white/90 p-0"
          disabled={isCreatingRoom}
          onPress={onJoinPress}
        >
          <ButtonText>참여하기</ButtonText>
        </Button>
        <Button
          variant="gradient"
          className="w-28 p-0"
          disabled={isCreatingRoom || !isCameraReady}
          onPress={onSharePress}
        >
          <ButtonText>
            {isCreatingRoom
              ? "방 만드는 중..."
              : isCameraReady
                ? "실시간 공유하기"
                : "카메라 준비 중..."}
          </ButtonText>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onPress={onChangeFlashMode}
        >
          <ButtonIcon className="h-7 w-7" as={IconBolt} />
        </Button>
      </HStack>
    </HStack>
  );
}
