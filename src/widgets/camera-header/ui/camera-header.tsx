import type { CameraPhotoFlashMode } from "@features/camera/capture-photo";
import { Button, ButtonIcon, ButtonText, HStack } from "@shared/ui";
import { IconBolt, IconChevronLeft } from "@tabler/icons-react-native";

const FLASH_MODE_LABELS: Record<CameraPhotoFlashMode, string> = {
  off: "끔",
  on: "켬",
  auto: "자동",
};

interface CameraHeaderProps {
  onBackPress: () => void;
  flashMode: CameraPhotoFlashMode;
  isFlashAvailable: boolean;
  onChangeFlashMode: () => void;
  onSharePress?: () => void;
  onJoinPress?: () => void;
  isCreatingRoom?: boolean;
  isCameraReady?: boolean;
}

export function CameraHeader({
  onBackPress,
  flashMode,
  isFlashAvailable,
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
          className="h-8 min-w-16 flex-row px-2"
          disabled={!isFlashAvailable}
          onPress={onChangeFlashMode}
          accessibilityLabel={
            isFlashAvailable
              ? `사진 플래시 ${FLASH_MODE_LABELS[flashMode]}`
              : "사진 플래시를 지원하지 않는 카메라"
          }
        >
          <ButtonIcon className="h-5 w-5" as={IconBolt} />
          <ButtonText className="ml-1 text-xs">
            {isFlashAvailable
              ? FLASH_MODE_LABELS[flashMode]
              : "없음"}
          </ButtonText>
        </Button>
      </HStack>
    </HStack>
  );
}
