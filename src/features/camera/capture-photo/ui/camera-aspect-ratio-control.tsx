import { HStack, Text } from "@shared/ui";
import { Pressable } from "react-native";

import type { CameraAspectRatio } from "../model/models";

const CAMERA_ASPECT_RATIOS = ["4:3", "16:9"] as const;

interface CameraAspectRatioControlProps {
  aspectRatio: CameraAspectRatio;
  disabled?: boolean;
  onChange: (aspectRatio: CameraAspectRatio) => void;
}

export function CameraAspectRatioControl({
  aspectRatio,
  disabled = false,
  onChange,
}: CameraAspectRatioControlProps) {
  return (
    <HStack
      className="absolute left-0 right-0 top-3 z-10 justify-center"
      pointerEvents="box-none"
    >
      <HStack
        className="rounded-full p-1"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      >
        {CAMERA_ASPECT_RATIOS.map((option) => {
          const isSelected = aspectRatio === option;

          return (
            <Pressable
              key={option}
              accessibilityLabel={`${option} 사진 비율`}
              accessibilityRole="button"
              accessibilityState={{
                disabled,
                selected: isSelected,
              }}
              className={`min-w-14 items-center justify-center rounded-full px-3 py-2 ${
                isSelected ? "bg-white" : ""
              }`}
              disabled={disabled}
              onPress={() => onChange(option)}
            >
              <Text
                className={
                  isSelected
                    ? "font-semibold text-black"
                    : "text-white"
                }
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </HStack>
    </HStack>
  );
}
