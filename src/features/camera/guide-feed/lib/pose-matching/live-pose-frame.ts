import type {
  CommonPose,
  CoordinateSize,
  DetectedPoseFrame,
} from "../../model/pose-types";
import { projectMediaPipePoseToCapture } from "./coordinate-transform";
import { adaptMediaPipePoses } from "./mediapipe-pose-adapter";
import type { ResizeMode } from "./types";

export interface PrepareLivePoseFrameOptions {
  captureSize: CoordinateSize;
  mirrorX: boolean;
  captureResizeMode?: ResizeMode;
}

export function prepareLivePoses(
  frame: DetectedPoseFrame,
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
