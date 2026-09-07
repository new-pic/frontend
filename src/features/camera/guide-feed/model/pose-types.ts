export const COMMON_JOINTS = [
  "NOSE",
  "LEFT_SHOULDER",
  "RIGHT_SHOULDER",
  "LEFT_ELBOW",
  "RIGHT_ELBOW",
  "LEFT_WRIST",
  "RIGHT_WRIST",
  "LEFT_HIP",
  "RIGHT_HIP",
  "LEFT_KNEE",
  "RIGHT_KNEE",
  "LEFT_ANKLE",
  "RIGHT_ANKLE",
] as const;

export type CommonJoint = (typeof COMMON_JOINTS)[number];

export interface CoordinateSize {
  width: number;
  height: number;
}

/**
 * CaptureNormalizedCoordinate contract:
 * - origin: final capture canvas top-left
 * - x: right, y: down
 * - x/y: normalized by final capture width/height
 * - values outside 0...1 are retained when cover-cropped
 */
export interface CommonPosePoint {
  x: number;
  y: number;
  confidence: number;
}

export interface PoseJointMap {
  joints: Partial<Record<CommonJoint, CommonPosePoint>>;
}

export interface CommonPose {
  joints: Partial<Record<CommonJoint, CommonPosePoint>>;
}

export interface DWPoseSourcePose extends PoseJointMap {
  coordinateSpace: "dwpose_source_normalized";
  sourcePersonIndex: number;
}

export interface MediaPipeInputPose extends PoseJointMap {
  coordinateSpace: "mediapipe_input_normalized";
}

export interface MediaPipePoseLandmark {
  x: number;
  y: number;
  z?: number;
  confidence?: number;
}

export interface DetectedPersonPose {
  landmarks: MediaPipePoseLandmark[];
}

export interface DetectedPoseFrame {
  timestamp: number;
  poses: DetectedPersonPose[];
  inputSize: CoordinateSize;
  sourceFrame: {
    width: number;
    height: number;
    rotationDegrees: 0 | 90 | 180 | 270;
    isMirrored: boolean;
  };
}

export interface PoseBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  area: number;
  center: { x: number; y: number };
}

export type PoseJointGroup =
  "TORSO" | "LEFT_ARM" | "RIGHT_ARM" | "LEFT_LEG" | "RIGHT_LEG";

export type PoseFeedback =
  | "NO_PERSON"
  | "PERSON_COUNT_MISMATCH"
  | "MOVE_LEFT"
  | "MOVE_RIGHT"
  | "MOVE_UP"
  | "MOVE_DOWN"
  | "MOVE_CLOSER"
  | "MOVE_FARTHER"
  | "ADJUST_LEFT_ARM"
  | "ADJUST_RIGHT_ARM"
  | "ADJUST_LEFT_LEG"
  | "ADJUST_RIGHT_LEG"
  | "ADJUST_TORSO"
  | "LOW_CONFIDENCE"
  | "ALIGNED";

export interface PoseMatchScore {
  overall: number;
  position: number;
  scale: number;
  pose: number;
}

export interface PosePairMetrics {
  targetCenter: { x: number; y: number };
  liveCenter: { x: number; y: number };
  centerDelta: { x: number; y: number };
  centerDistance: number;
  targetBoundingBox: PoseBoundingBox;
  liveBoundingBox: PoseBoundingBox;
  scaleRatio: number;
  comparableJointCount: number;
  jointErrors: Partial<Record<CommonJoint, number>>;
  jointGroupScores: Partial<Record<PoseJointGroup, number>>;
}

export interface PosePairMatch {
  score: PoseMatchScore;
  metrics: PosePairMetrics | null;
  isComparable: boolean;
  isAligned: boolean;
}

export interface PoseAssignment {
  targetIndex: number;
  liveIndex: number;
  score: number;
  match: PosePairMatch;
}

export type PoseMismatchCause =
  | "NO_PERSON"
  | "PERSON_COUNT"
  | "POSITION"
  | "SCALE"
  | "TORSO"
  | "LEFT_ARM"
  | "RIGHT_ARM"
  | "LEFT_LEG"
  | "RIGHT_LEG"
  | "CONFIDENCE";

export interface WorstPoseMatch {
  targetIndex: number;
  liveIndex: number;
  score: number;
  cause: PoseMismatchCause;
}

export interface PoseSceneMatchResult {
  aligned: boolean;
  sceneScore: number;
  feedback: PoseFeedback;
  assignments: PoseAssignment[];
  unmatchedTargetIndices: number[];
  unmatchedLiveIndices: number[];
  worstMatch: WorstPoseMatch | null;
  largestMismatch: PoseMismatchCause | null;
}
