import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { CoordinateSize } from "../lib/pose-matching";
import {
  createGuideContourPath,
  projectGuideOutlineToPreview,
} from "../lib/guide-contour-projection";
import type { CameraGuideOutline } from "../model";

interface CameraGuideOverlayProps {
  previewSize: CoordinateSize;
  outline: CameraGuideOutline;
  warning: boolean;
}

const GUIDE_OUTLINE_COLOR = "#FFFFFF";
const GUIDE_WARNING_COLOR = "#FF3B30";
const GUIDE_OUTLINE_SHADOW_COLOR = "rgba(0,0,0,0.5)";
const GUIDE_OUTLINE_WIDTH = 3;
const GUIDE_OUTLINE_SHADOW_WIDTH = 5;

export const CameraGuideOverlay = memo(function CameraGuideOverlay({
  previewSize,
  outline,
  warning,
}: CameraGuideOverlayProps) {
  const paths = useMemo(
    () =>
      projectGuideOutlineToPreview(outline, previewSize).map((contour) => ({
        key: contour.contourIndex,
        path: createGuideContourPath(contour),
      })),
    [outline, previewSize],
  );

  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Svg
        pointerEvents="none"
        width={previewSize.width}
        height={previewSize.height}
        viewBox={`0 0 ${previewSize.width} ${previewSize.height}`}
        style={StyleSheet.absoluteFill}
      >
        {paths.map(({ key, path }) => (
          <Path
            key={`shadow-${key}`}
            d={path}
            fill="none"
            stroke={GUIDE_OUTLINE_SHADOW_COLOR}
            strokeWidth={GUIDE_OUTLINE_SHADOW_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {paths.map(({ key, path }) => (
          <Path
            key={key}
            d={path}
            fill="none"
            stroke={warning ? GUIDE_WARNING_COLOR : GUIDE_OUTLINE_COLOR}
            strokeWidth={GUIDE_OUTLINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
});
