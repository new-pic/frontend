import type {
  FeedPoseResponse,
  NormalizedPoseResult,
} from "@entities/feed";
import type {
  CommonPose,
  SourcePoseToCaptureTransform,
} from "./types";
import { projectDWPosePoseToCapture } from "./coordinate-transform";
import { adaptDWPoseResult } from "./dwpose-pose-adapter";

export function getNormalizedPoseResult(
  response: FeedPoseResponse,
): NormalizedPoseResult {
  return {
    landmarks: response.poseLandmarks,
    analysis: response.poseAnalysis,
  };
}

export function prepareFeedTargetPoses(
  response: FeedPoseResponse,
  transform: SourcePoseToCaptureTransform,
): CommonPose[] {
  return adaptDWPoseResult(
    getNormalizedPoseResult(response),
    transform.sourceSize,
  ).map((pose) =>
    projectDWPosePoseToCapture(pose, transform),
  );
}
