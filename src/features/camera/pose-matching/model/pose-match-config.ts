import type {
  CommonJoint,
  PoseJointGroup,
} from "./types";

export interface PoseMatchConfig {
  minConfidence: number;
  excludeOutsideCapture: boolean;
  minimumComparableJoints: number;
  scoreWeights: {
    position: number;
    scale: number;
    pose: number;
  };
  assignmentWeights: {
    position: number;
    scale: number;
    pose: number;
  };
  positionTolerance: number;
  scaleLogTolerance: number;
  poseJointTolerance: number;
  personAlignmentThreshold: number;
  minimumPositionScore: number;
  minimumScaleScore: number;
  minimumPoseScore: number;
  minimumJointGroupScore: number;
  directionDeadZone: number;
  scaleDeadZoneLog: number;
  maxExactAssignmentPeople: number;
  jointGroupWeights: Record<PoseJointGroup, number>;
  jointGroups: Record<PoseJointGroup, readonly CommonJoint[]>;
}

/**
 * Initial calibration parameters.
 *
 * These values are intentionally centralized because they must be tuned with
 * real devices, camera formats, poses, and user testing before release.
 */
export const DEFAULT_POSE_MATCH_CONFIG: PoseMatchConfig = {
  minConfidence: 0.5,
  excludeOutsideCapture: true,
  minimumComparableJoints: 6,
  scoreWeights: {
    position: 0.3,
    scale: 0.2,
    pose: 0.5,
  },
  assignmentWeights: {
    position: 0.35,
    scale: 0.2,
    pose: 0.45,
  },
  positionTolerance: 0.12,
  scaleLogTolerance: 0.25,
  poseJointTolerance: 0.45,
  personAlignmentThreshold: 82,
  minimumPositionScore: 70,
  minimumScaleScore: 70,
  minimumPoseScore: 72,
  minimumJointGroupScore: 65,
  directionDeadZone: 0.035,
  scaleDeadZoneLog: 0.12,
  maxExactAssignmentPeople: 8,
  jointGroupWeights: {
    TORSO: 1.4,
    LEFT_ARM: 1,
    RIGHT_ARM: 1,
    LEFT_LEG: 1.1,
    RIGHT_LEG: 1.1,
  },
  jointGroups: {
    TORSO: [
      "NOSE",
      "LEFT_SHOULDER",
      "RIGHT_SHOULDER",
      "LEFT_HIP",
      "RIGHT_HIP",
    ],
    LEFT_ARM: ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
    RIGHT_ARM: ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
    LEFT_LEG: ["LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"],
    RIGHT_LEG: ["RIGHT_HIP", "RIGHT_KNEE", "RIGHT_ANKLE"],
  },
};
