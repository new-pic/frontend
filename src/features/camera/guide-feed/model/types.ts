import type { CameraAspectRatio } from "../../capture-photo";
import type {
  CommonPose,
  CoordinateSize,
  DWPoseSourcePose,
  PoseSceneMatchResult,
} from "../../pose-matching";

export interface GuideFeedSelection {
  feedId: string;
  thumbnailUrl: string;
  detailImageUrl: string;
}

export interface CameraGuideMask {
  imageUrl: string;
  sourceSize: CoordinateSize;
}

export interface CameraGuideTarget {
  sourceSize: CoordinateSize;
  sourcePoses: DWPoseSourcePose[];
}

export interface ActiveCameraGuide {
  selection: GuideFeedSelection;
  referenceSize: CoordinateSize;
  cameraAspectRatio: CameraAspectRatio;
  mask: CameraGuideMask | null;
  target: CameraGuideTarget | null;
}

export interface CameraGuideErrors {
  reference: string | null;
  mask: string | null;
  target: string | null;
}

export interface CameraGuideMatching {
  targetPoses: CommonPose[];
  currentPoses: CommonPose[];
  result: PoseSceneMatchResult | null;
}
