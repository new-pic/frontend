import type { CameraAspectRatio } from "../model/models";

export type CameraChromePresentation = "inline" | "overlay";
export type CameraStageAlignment = "top" | "center";

export function resolveCameraChromePresentation(
  aspectRatio: CameraAspectRatio,
): CameraChromePresentation {
  return aspectRatio === "16:9" ? "overlay" : "inline";
}

export function resolveCameraStageAlignment(
  aspectRatio: CameraAspectRatio,
): CameraStageAlignment {
  return aspectRatio === "16:9" ? "center" : "top";
}
