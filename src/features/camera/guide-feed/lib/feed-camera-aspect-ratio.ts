import type { CameraGuideAspectRatio } from "../model/types";
import type { CoordinateSize } from "./pose-matching";

const SUPPORTED_ASPECT_RATIOS = {
  "4:3": 4 / 3,
  "16:9": 16 / 9,
} as const satisfies Record<CameraGuideAspectRatio, number>;

function getOrientationIndependentRatio({ width, height }: CoordinateSize) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Feed image must have positive dimensions.");
  }

  return Math.max(width, height) / Math.min(width, height);
}

/**
 * Following-feed mode locks the Camera to the closest aspect-ratio family
 * supported by the product. Log distance treats inverse scale differences
 * symmetrically.
 */
export function resolveFeedCameraAspectRatio(
  sourceSize: CoordinateSize,
): CameraGuideAspectRatio {
  const sourceRatio = getOrientationIndependentRatio(sourceSize);
  const candidates = Object.entries(SUPPORTED_ASPECT_RATIOS) as [
    CameraGuideAspectRatio,
    number,
  ][];

  return candidates.reduce((closest, candidate) =>
    Math.abs(Math.log(sourceRatio / candidate[1])) <
    Math.abs(Math.log(sourceRatio / closest[1]))
      ? candidate
      : closest,
  )[0];
}
