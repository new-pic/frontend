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

export interface CommonPose {
  joints: Partial<Record<CommonJoint, CommonPosePoint>>;
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
  | "TORSO"
  | "LEFT_ARM"
  | "RIGHT_ARM"
  | "LEFT_LEG"
  | "RIGHT_LEG";

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
  | "RIGHT_LEG";

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

export type CoordinateUnit = "normalized" | "pixel";
export type QuarterTurn = 0 | 90 | 180 | 270;
export type ResizeMode = "cover" | "contain";
export type CaptureAspectRatio = "4:3" | "16:9";

export interface CoordinateSize {
  width: number;
  height: number;
}

export interface RawToCaptureTransform {
  sourceSize: CoordinateSize;
  captureSize: CoordinateSize;
  coordinateUnit: CoordinateUnit;
  /**
   * Clockwise rotation needed to put the raw model frame into the final
   * capture orientation. Derive this from native frame/capture metadata.
   */
  rotationDegrees: QuarterTurn;
  /**
   * Whether the final saved capture is horizontally mirrored.
   * Preview-only mirroring belongs to CaptureToPreviewTransform instead.
   */
  mirrorX: boolean;
  captureResizeMode: ResizeMode;
}

export interface CaptureToPreviewTransform {
  captureSize: CoordinateSize;
  previewSize: CoordinateSize;
  previewResizeMode: ResizeMode;
  /**
   * Set only when preview presentation differs from the saved capture.
   */
  mirrorX: boolean;
}

export interface PreviewPoint {
  x: number;
  y: number;
}
