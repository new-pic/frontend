import { colors } from "@shared/ui/theme";
import { BottomSheetModal, HStack, Pressable, Text, VStack } from "@shared/ui";
import { IconBolt, IconBoltOff } from "@tabler/icons-react-native";
import type {
  CameraAspectRatio,
  CameraCaptureSettings,
  CameraPhotoFlashMode,
} from "../model/models";

const FLASH_OPTIONS: {
  mode: CameraPhotoFlashMode;
  label: string;
}[] = [
  { mode: "off", label: "끔" },
  { mode: "on", label: "켬" },
  { mode: "auto", label: "AUTO" },
];

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
  return (
    <BottomSheetModal open={open} onClose={onClose} snapPoints={["38%"]}>
      <VStack className="flex-1 gap-6 px-6 pb-8 pt-5">
        <Text size="xl" bold>
          촬영 설정
        </Text>

        <VStack className="gap-3">
          <Text bold>플래시</Text>
          <HStack className="gap-3">
            {FLASH_OPTIONS.map(({ mode, label }) => {
              const selected = settings.flashMode === mode;
              const disabled = mode !== "off" && !isFlashAvailable;

              return (
                <Pressable
                  key={mode}
                  accessibilityRole="button"
                  accessibilityLabel={`사진 플래시 ${label}`}
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
              현재 카메라는 물리 플래시를 지원하지 않습니다.
            </Text>
          ) : null}
        </VStack>

        <VStack className="gap-3">
          <Text bold>사진 비율</Text>
          <HStack className="gap-3">
            {ASPECT_RATIO_OPTIONS.map((ratio) => {
              const selected = settings.aspectRatio === ratio;
              const disabled = isAspectRatioLocked || !isAspectRatioReady;

              return (
                <Pressable
                  key={ratio}
                  accessibilityRole="button"
                  accessibilityLabel={`사진 비율 ${ratio}`}
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
              선택한 가이드의 비율에 맞춰 촬영 비율이 고정됩니다.
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </BottomSheetModal>
  );
}
