import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { CameraRuntimeGeometry } from "../../capture-photo";
import { projectSourceCanvasToPreviewRect } from "../../pose-matching";
import type { CameraGuideMask } from "../model";

interface CameraGuideOverlayProps {
  geometry: CameraRuntimeGeometry;
  mask: CameraGuideMask;
  onError?: () => void;
}

export function CameraGuideOverlay({
  geometry,
  mask,
  onError,
}: CameraGuideOverlayProps) {
  const renderRect = useMemo(
    () =>
      projectSourceCanvasToPreviewRect(mask.sourceSize, {
        captureSize: geometry.captureSize,
        previewSize: geometry.previewSize,
        previewResizeMode: "cover",
        // Camera preview and PhotoOutput share VisionCamera's auto
        // mirror mode. The target mask is already in output space.
        mirrorX: false,
      }),
    [geometry.captureSize, geometry.previewSize, mask.sourceSize],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={mask.imageUrl}
        recyclingKey={mask.imageUrl}
        contentFit="fill"
        onError={onError}
        style={{
          position: "absolute",
          left: renderRect.x,
          top: renderRect.y,
          width: renderRect.width,
          height: renderRect.height,
        }}
      />
    </View>
  );
}
