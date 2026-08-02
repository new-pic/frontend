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

export interface CameraGuideContourPoint {
  x: number;
  y: number;
}

export interface CameraGuideContour {
  contourIndex: number;
  closed: boolean;
  areaRatio: number;
  points: CameraGuideContourPoint[];
}

export interface CameraGuideOutline {
  sourceSize: CoordinateSize;
  contours: CameraGuideContour[];
}

export interface CameraGuideTarget {
  sourceSize: CoordinateSize;
  sourcePoses: DWPoseSourcePose[];
}

export interface ActiveCameraGuide {
  selection: GuideFeedSelection;
  referenceSize: CoordinateSize;
  cameraAspectRatio: CameraAspectRatio;
  outline: CameraGuideOutline | null;
  target: CameraGuideTarget | null;
}

export interface CameraGuideErrors {
  reference: string | null;
  outline: string | null;
  target: string | null;
}

export interface CameraGuideMatching {
  targetPoses: CommonPose[];
  currentPoses: CommonPose[];
  result: PoseSceneMatchResult | null;
}
