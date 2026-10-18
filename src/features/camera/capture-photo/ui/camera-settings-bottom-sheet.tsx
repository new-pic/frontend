import { colors } from "@shared/ui/theme";
import { BottomSheetModal, HStack, Pressable, Text, VStack } from "@shared/ui";
import { useAppTranslation } from "@shared/lib";
import { IconBolt, IconBoltOff } from "@tabler/icons-react-native";
import type {
  CameraAspectRatio,
  CameraCaptureSettings,
  CameraPhotoFlashMode,
} from "../model/models";

const FLASH_OPTIONS: {
  mode: CameraPhotoFlashMode;
}[] = [{ mode: "off" }, { mode: "on" }, { mode: "auto" }];

const ASPECT_RATIO_OPTIONS: CameraAspectRatio[] = ["4:3", "16:9"];

interface CameraSettingsBottomSheetProps {
  open: boolean;
  settings: CameraCaptureSettings;
  isFlashAvailable: boolean;
  isAspectRatioLocked: boolean;
  isAspectRatioReady: boolean;
  onClose: () => void;
  onFlashModeChange: (mode: CameraPhotoFlashMode) => void;
  onAspectRatioChange: (ratio: CameraAspectRatio) => void;
}

export function CameraSettingsBottomSheet({
  open,
  settings,
  isFlashAvailable,
  isAspectRatioLocked,
  isAspectRatioReady,
  onClose,
  onFlashModeChange,
  onAspectRatioChange,
}: CameraSettingsBottomSheetProps) {
  const { t } = useAppTranslation();

  return (
    <BottomSheetModal open={open} onClose={onClose} snapPoints={["38%"]}>
      <VStack className="flex-1 gap-6 px-6 pb-8 pt-5">
        <Text size="xl" bold>
          {t("camera.settingsTitle")}
        </Text>

        <VStack className="gap-3">
          <Text bold>{t("camera.flash")}</Text>
          <HStack className="gap-3">
            {FLASH_OPTIONS.map(({ mode }) => {
              const selected = settings.flashMode === mode;
              const disabled = mode !== "off" && !isFlashAvailable;
              const label =
                mode === "off"
                  ? t("camera.flashOff")
                  : mode === "on"
                    ? t("camera.flashOn")
                    : t("camera.flashAuto");

              return (
                <Pressable
                  key={mode}
                  accessibilityRole="button"
                  accessibilityLabel={t("camera.flashAccessibility", {
                    label,
                  })}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onFlashModeChange(mode)}
                  style={{
                    width: 60,
                    height: 60,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 30,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected
                      ? colors.brand.primary
                      : colors.outline,
                    backgroundColor: selected
                      ? colors.brand.light
                      : disabled
                        ? "#f3f4f6"
                        : "white",
                    opacity: disabled ? 0.45 : 1,
                  }}
                >
                  {mode === "auto" ? (
                    <Text
                      bold
                      className="text-xs"
                      style={{
                        color: selected ? colors.brand.primary : "#111111",
                      }}
                    >
                      AUTO
                    </Text>
                  ) : mode === "on" ? (
                    <IconBolt
                      size={25}
                      color={selected ? colors.brand.primary : "#111111"}
                    />
                  ) : (
                    <IconBoltOff
                      size={25}
                      color={selected ? colors.brand.primary : "#111111"}
                    />
                  )}
                </Pressable>
              );
            })}
          </HStack>
          {!isFlashAvailable ? (
            <Text className="text-xs text-label-muted">
              {t("camera.flashUnavailable")}
            </Text>
          ) : null}
        </VStack>

        <VStack className="gap-3">
          <Text bold>{t("camera.aspectRatio")}</Text>
          <HStack className="gap-3">
            {ASPECT_RATIO_OPTIONS.map((ratio) => {
              const selected = settings.aspectRatio === ratio;
              const disabled = isAspectRatioLocked || !isAspectRatioReady;

              return (
                <Pressable
                  key={ratio}
                  accessibilityRole="button"
                  accessibilityLabel={t("camera.aspectRatioAccessibility", {
                    ratio,
                  })}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onAspectRatioChange(ratio)}
                  style={{
                    width: 60,
                    height: 60,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 30,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected
                      ? colors.brand.primary
                      : colors.outline,
                    backgroundColor: selected ? colors.brand.light : "white",
                    opacity: disabled ? 0.45 : 1,
                  }}
                >
                  <Text
                    bold
                    style={{
                      color: selected ? colors.brand.primary : "#111111",
                    }}
                  >
                    {ratio}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
          {isAspectRatioLocked ? (
            <Text className="text-xs text-label-muted">
              {t("camera.guideAspectRatioLocked")}
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </BottomSheetModal>
  );
}
