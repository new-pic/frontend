import { memo } from "react";
import { View } from "react-native";
import { getFramingGridLinePercentages } from "./framing-grid-layout";

export { getFramingGridLinePercentages } from "./framing-grid-layout";

const FRAMING_GRID_LINE_PERCENTAGES = getFramingGridLinePercentages();

interface FramingGridOverlayProps {
  color?: string;
  lineWidth?: number;
}

export const FramingGridOverlay = memo(function FramingGridOverlay({
  color = "rgba(255, 255, 255, 0.42)",
  lineWidth = 1,
}: FramingGridOverlayProps) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute inset-0"
    >
      {FRAMING_GRID_LINE_PERCENTAGES.map((percentage) => (
        <View
          key={`vertical-${percentage}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${percentage}%`,
            width: lineWidth,
            backgroundColor: color,
          }}
        />
      ))}
      {FRAMING_GRID_LINE_PERCENTAGES.map((percentage) => (
        <View
          key={`horizontal-${percentage}`}
          style={{
            position: "absolute",
            right: 0,
            left: 0,
            top: `${percentage}%`,
            height: lineWidth,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
});
