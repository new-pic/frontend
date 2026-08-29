import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { CoordinateSize } from "../lib/pose-matching";
import { projectGuideSourceToPreviewRect } from "../lib/guide-contour-projection";

interface CameraGuideReferenceOverlayProps {
  imageUrl: string;
  sourceSize: CoordinateSize;
  previewSize: CoordinateSize;
}

const GUIDE_REFERENCE_OPACITY = 0.3;

export const CameraGuideReferenceOverlay = memo(
  function CameraGuideReferenceOverlay({
    imageUrl,
    sourceSize,
    previewSize,
  }: CameraGuideReferenceOverlayProps) {
    const renderRect = useMemo(
      () => projectGuideSourceToPreviewRect(sourceSize, previewSize),
      [previewSize, sourceSize],
    );

    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={imageUrl}
          recyclingKey={imageUrl}
          cachePolicy="memory-disk"
          contentFit="fill"
          style={{
            position: "absolute",
            left: renderRect.x,
            top: renderRect.y,
            width: renderRect.width,
            height: renderRect.height,
            opacity: GUIDE_REFERENCE_OPACITY,
          }}
        />
      </View>
    );
  },
);
