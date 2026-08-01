import type { CameraChromePresentation } from "@features/camera/capture-photo";
import { Button, ButtonIcon, HStack } from "@shared/ui";
import { IconChevronLeft, IconSettings } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";

const OVERLAY_ICON_SHADOW_STYLE = {
  filter: [
    {
      dropShadow: {
        offsetX: 0,
        offsetY: 2,
        standardDeviation: 2,
        color: "rgba(0,0,0,0.55)",
      },
    },
  ],
} satisfies ViewStyle;

interface CameraHeaderProps {
  onBackPress: () => void;
  onSettingsPress: () => void;
  rtcControl?: ReactNode;
  presentation: CameraChromePresentation;
}

export function CameraHeader({
  onBackPress,
  onSettingsPress,
  rtcControl,
  presentation,
}: CameraHeaderProps) {
  const isOverlay = presentation === "overlay";

  return (
    <HStack
      className={`${isOverlay ? "absolute top-0 z-10" : "bg-white"} w-full justify-between px-4 py-3`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        style={isOverlay ? OVERLAY_ICON_SHADOW_STYLE : undefined}
        accessibilityLabel="카메라 닫기"
        onPress={onBackPress}
      >
        <ButtonIcon
          as={IconChevronLeft}
          color={isOverlay ? "white" : "#111111"}
        />
      </Button>
      <HStack space="sm" className="items-center">
        {rtcControl}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          style={isOverlay ? OVERLAY_ICON_SHADOW_STYLE : undefined}
          onPress={onSettingsPress}
          accessibilityLabel="카메라 촬영 설정"
        >
          <ButtonIcon
            className="h-6 w-6"
            as={IconSettings}
            color={isOverlay ? "white" : "#111111"}
          />
        </Button>
      </HStack>
    </HStack>
  );
}
