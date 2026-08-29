import type { CommonPose, CoordinateSize, ResizeMode } from "./types";
import { projectMediaPipePoseToCapture } from "./coordinate-transform";
import { adaptMediaPipePoses } from "./mediapipe-pose-adapter";

export interface PrepareLivePoseFrameOptions {
  captureSize: CoordinateSize;
  mirrorX: boolean;
  captureResizeMode?: ResizeMode;
}

export interface LiveDetectedPoseFrame {
  poses: {
    landmarks: {
      x: number;
      y: number;
      z?: number;
      confidence?: number;
    }[];
  }[];
  inputSize: CoordinateSize;
}

export function prepareLivePoses(
  frame: LiveDetectedPoseFrame,
  {
    captureSize,
    mirrorX,
    captureResizeMode = "cover",
  }: PrepareLivePoseFrameOptions,
): CommonPose[] {
  return adaptMediaPipePoses(frame.poses).map((pose) =>
    projectMediaPipePoseToCapture(pose, {
      inputSize: frame.inputSize,
      captureSize,
      mirrorX,
      captureResizeMode,
    }),
  );
}
