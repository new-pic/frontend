import { HStack, Text } from "@shared/ui";
import { useMemo } from "react";
import { Pressable } from "react-native";

/**
 * @description
 */
interface ZoomControlsProps {
  zoomLevel: number;
  zoomLevels: readonly number[];
  onZoomChange: (zoomLevel: number) => void;
}

function formatZoomLevel(zoomLevel: number) {
  const roundedZoomLevel = Math.round(zoomLevel * 10) / 10;
  return Number.isInteger(roundedZoomLevel)
    ? roundedZoomLevel.toFixed(0)
    : roundedZoomLevel.toFixed(1);
}

export function ZoomControls({
  zoomLevel,
  zoomLevels,
  onZoomChange,
}: ZoomControlsProps) {
  const activeZoomLevel = useMemo(() => {
    return zoomLevels.reduce((closestLevel, level) => {
      const closestDistance = Math.abs(zoomLevel - closestLevel);
      const currentDistance = Math.abs(zoomLevel - level);
      return currentDistance < closestDistance ? level : closestLevel;
    }, zoomLevels[0]);
  }, [zoomLevel, zoomLevels]);

  return (
    <HStack
      className="absolute bottom-10 left-0 right-0 justify-center items-center space-x-4"
      space="md"
      pointerEvents="box-none"
    >
      {zoomLevels.map((level) => {
        const isActive = activeZoomLevel === level;
        const label = formatZoomLevel(isActive ? zoomLevel : level);

        return (
          <Pressable
            key={level}
            accessibilityLabel={`${formatZoomLevel(level)}배 줌`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            hitSlop={8}
            onPress={() => onZoomChange(level)}
            className={`p-0 w-10 h-10 rounded-full items-center justify-center ${isActive ? "border border-brand-light" : ""}`}
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <Text className="text-white">{label}x</Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}
