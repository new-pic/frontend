import type { CommonPose, DetectedPoseFrame } from "../../model/pose-types";
import {
  createLivePoseProjectionTransform,
  projectMediaPipePoseToCapture,
} from "./coordinate-transform";
import { adaptMediaPipePoses } from "./mediapipe-pose-adapter";
import type { PoseProjectionContext } from "./types";

export interface PrepareLivePoseFrameOptions {
  projectionContext: PoseProjectionContext;
}

export function prepareLivePoses(
  frame: DetectedPoseFrame,
  { projectionContext }: PrepareLivePoseFrameOptions,
): CommonPose[] {
  return adaptMediaPipePoses(frame.poses).map((pose) =>
    projectMediaPipePoseToCapture(
      pose,
      createLivePoseProjectionTransform(
        projectionContext,
        frame.inputSize,
        frame.sourceFrame.isMirrored,
      ),
    ),
  );
}
