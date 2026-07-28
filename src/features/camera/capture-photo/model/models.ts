export type SessionPhoto = { id: string; uri: string };

export type CameraAspectRatio = "4:3" | "16:9";

export type CameraPhotoFlashMode = "off" | "on" | "auto";

export interface CameraCaptureSettings {
  aspectRatio: CameraAspectRatio;
  flashMode: CameraPhotoFlashMode;
}

export interface CameraResolution {
  width: number;
  height: number;
}
