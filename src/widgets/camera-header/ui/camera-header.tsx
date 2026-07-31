import { Button, ButtonIcon, HStack } from "@shared/ui";
import { IconChevronLeft, IconSettings } from "@tabler/icons-react-native";
import type { ReactNode } from "react";

interface CameraHeaderProps {
  onBackPress: () => void;
  onSettingsPress: () => void;
  rtcControl?: ReactNode;
}

export function CameraHeader({
  onBackPress,
  onSettingsPress,
  rtcControl,
}: CameraHeaderProps) {
  return (
    <HStack className="absolute top-0 z-10 w-full justify-between px-4 py-3">
      <Button variant="ghost" size="icon" onPress={onBackPress}>
        <ButtonIcon as={IconChevronLeft} />
      </Button>
      <HStack space="sm" className="items-center">
        {rtcControl}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-white/75"
          onPress={onSettingsPress}
          accessibilityLabel="카메라 촬영 설정"
        >
          <ButtonIcon className="h-6 w-6" as={IconSettings} />
        </Button>
      </HStack>
    </HStack>
  );
}
