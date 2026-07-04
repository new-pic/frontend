import { HStack, Text } from "@shared/ui";
import { useMemo } from "react";
import { Pressable } from "react-native";

/**
 * @description
 */
interface ZoomControlsProps {
  zoomLevel?: number;
}

const ZOOM_LEVELS = { MIN: 0.5, NEUTRAL: 1, MAX: 2 };

export function ZoomControls({
  zoomLevel = ZOOM_LEVELS.NEUTRAL,
}: ZoomControlsProps) {
  const activeZoomLevel = useMemo(() => {
    if (zoomLevel >= ZOOM_LEVELS.MAX) return ZOOM_LEVELS.MAX;
    else if (zoomLevel >= ZOOM_LEVELS.NEUTRAL) return ZOOM_LEVELS.NEUTRAL;
    else return ZOOM_LEVELS.MIN;
  }, [zoomLevel]);

  return (
    <HStack
      className="absolute bottom-10 left-0 right-0 justify-center items-center space-x-4"
      space="md"
    >
      {Object.values(ZOOM_LEVELS).map((level) => (
        <Pressable
          key={level}
          className={`p-0 w-10 h-10 rounded-full items-center justify-center ${activeZoomLevel === level ? "border border-brand-light" : ""}`}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <Text className="text-white">
            {activeZoomLevel === level ? zoomLevel : level}
          </Text>
        </Pressable>
      ))}
    </HStack>
  );
}
