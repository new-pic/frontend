import { CommonResolutions } from "react-native-vision-camera";

import type {
  CameraAspectRatio,
  CameraCaptureSettings,
  CameraPhotoFlashMode,
  CameraResolution,
} from "../model/models";

const RESOLUTION_ASPECT_RATIO_TOLERANCE = 0.02;

const PHOTO_TARGET_RESOLUTIONS = {
  "4:3": CommonResolutions.UHD_4_3,
  "16:9": CommonResolutions.UHD_16_9,
} as const satisfies Record<CameraAspectRatio, CameraResolution>;

const FLASH_MODE_ORDER = [
  "off",
  "on",
  "auto",
] as const satisfies readonly CameraPhotoFlashMode[];

export const DEFAULT_CAMERA_CAPTURE_SETTINGS: CameraCaptureSettings = {
  aspectRatio: "4:3",
  flashMode: "off",
};

export function getPhotoTargetResolution(
  aspectRatio: CameraAspectRatio,
): CameraResolution {
  return PHOTO_TARGET_RESOLUTIONS[aspectRatio];
}

export function getPortraitPreviewAspectRatio(
  aspectRatio: CameraAspectRatio,
): number {
  const resolution = getPhotoTargetResolution(aspectRatio);
  return resolution.width / resolution.height;
}

export function getEffectivePhotoFlashMode(
  flashMode: CameraPhotoFlashMode,
  hasFlash: boolean,
): CameraPhotoFlashMode {
  return hasFlash ? flashMode : "off";
}

export function getNextPhotoFlashMode(
  flashMode: CameraPhotoFlashMode,
  hasFlash: boolean,
): CameraPhotoFlashMode {
  if (!hasFlash) return "off";

  const currentIndex = FLASH_MODE_ORDER.indexOf(flashMode);
  return FLASH_MODE_ORDER[(currentIndex + 1) % FLASH_MODE_ORDER.length];
}

export function getOrientationIndependentAspectRatio({
  width,
  height,
}: CameraResolution): number {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Camera resolution must have positive dimensions.");
  }

  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  return longSide / shortSide;
}

export function orientCameraResolution(
  resolution: CameraResolution,
  orientation: "up" | "right" | "down" | "left",
): CameraResolution {
  return orientation === "right" || orientation === "left"
    ? {
        width: resolution.height,
        height: resolution.width,
      }
    : resolution;
}

export function isResolutionMatchingAspectRatio(
  resolution: CameraResolution,
  aspectRatio: CameraAspectRatio,
): boolean {
  const targetResolution = getPhotoTargetResolution(aspectRatio);
  const actualRatio =
    getOrientationIndependentAspectRatio(resolution);
  const targetRatio =
    getOrientationIndependentAspectRatio(targetResolution);

  return (
    Math.abs(actualRatio - targetRatio) <=
    RESOLUTION_ASPECT_RATIO_TOLERANCE
  );
}
