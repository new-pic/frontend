export type SessionPhoto = { id: string; uri: string };

export type CameraAspectRatio = "4:3" | "16:9";

export type CameraPhotoFlashMode = "off" | "on" | "auto";
export type CameraPosition = "front" | "back";
export type CameraMirrorMode = "on" | "off";

export interface CameraCaptureSettings {
  aspectRatio: CameraAspectRatio;
  flashMode: CameraPhotoFlashMode;
}

export interface CameraResolution {
  width: number;
  height: number;
}

export interface CameraRuntimeGeometry {
  aspectRatio: CameraAspectRatio;
  captureSize: CameraResolution;
  previewSize: CameraResolution;
  cameraPosition: CameraPosition;
  captureMirrorX: boolean;
}
