import {
  type CommonPose,
  type PoseAssignment,
  type PoseFeedback,
  type PoseJointGroup,
  type PoseMismatchCause,
  type PosePairMatch,
  type PoseSceneMatchResult,
} from "./types";
import {
  DEFAULT_POSE_MATCH_CONFIG,
  type PoseMatchConfig,
} from "./pose-match-config";
import { assignPoses } from "./pose-assignment";

function getLowestJointGroup(match: PosePairMatch): PoseJointGroup {
  const groupScores = match.metrics?.jointGroupScores ?? {};
  const entries = Object.entries(groupScores) as [PoseJointGroup, number][];

  return entries.length > 0
    ? entries.reduce((lowest, current) =>
        current[1] < lowest[1] ? current : lowest,
      )[0]
    : "TORSO";
}

function getLargestPairMismatch(match: PosePairMatch): PoseMismatchCause {
  if (!match.isComparable) {
    return "CONFIDENCE";
  }

  const componentScores = [
    ["POSITION", match.score.position],
    ["SCALE", match.score.scale],
    ["POSE", match.score.pose],
  ] as const;
  const lowestComponent = componentScores.reduce((lowest, current) =>
    current[1] < lowest[1] ? current : lowest,
  )[0];

  return lowestComponent === "POSE"
    ? getLowestJointGroup(match)
    : lowestComponent;
}

function getAssignmentSeverity(assignment: PoseAssignment) {
  const groupScores = Object.values(
    assignment.match.metrics?.jointGroupScores ?? {},
  );
  return Math.min(
    assignment.match.score.overall,
    assignment.match.score.position,
    assignment.match.score.scale,
    assignment.match.score.pose,
    ...(groupScores.length > 0 ? groupScores : [100]),
  );
}

function findWorstAssignment(assignments: PoseAssignment[]) {
  if (assignments.length === 0) return null;

  return assignments.reduce((worst, current) =>
    getAssignmentSeverity(current) < getAssignmentSeverity(worst)
      ? current
      : worst,
  );
}

function feedbackForPoseGroup(group: PoseJointGroup): PoseFeedback {
  switch (group) {
    case "LEFT_ARM":
      return "ADJUST_LEFT_ARM";
    case "RIGHT_ARM":
      return "ADJUST_RIGHT_ARM";
    case "LEFT_LEG":
      return "ADJUST_LEFT_LEG";
    case "RIGHT_LEG":
      return "ADJUST_RIGHT_LEG";
    case "TORSO":
      return "ADJUST_TORSO";
  }
}

function getFeedback(
  match: PosePairMatch,
  cause: PoseMismatchCause,
  config: PoseMatchConfig,
): PoseFeedback {
  if (cause === "CONFIDENCE") {
    return "LOW_CONFIDENCE";
  }

  const metrics = match.metrics;
  if (!metrics) return "ADJUST_TORSO";

  if (cause === "POSITION") {
    const { x, y } = metrics.centerDelta;
    if (Math.abs(x) >= Math.abs(y) && Math.abs(x) > config.directionDeadZone) {
      return x < 0 ? "MOVE_RIGHT" : "MOVE_LEFT";
    }
    if (Math.abs(y) > config.directionDeadZone) {
      return y < 0 ? "MOVE_DOWN" : "MOVE_UP";
    }
  }

  if (
    cause === "SCALE" &&
    Math.abs(Math.log(metrics.scaleRatio)) > config.scaleDeadZoneLog
  ) {
    return metrics.scaleRatio > 1 ? "MOVE_FARTHER" : "MOVE_CLOSER";
  }

  if (
    cause === "TORSO" ||
    cause === "LEFT_ARM" ||
    cause === "RIGHT_ARM" ||
    cause === "LEFT_LEG" ||
    cause === "RIGHT_LEG"
  ) {
    return feedbackForPoseGroup(cause);
  }

  return feedbackForPoseGroup(getLowestJointGroup(match));
}

export function matchPoseScene(
  targets: readonly CommonPose[],
  livePoses: readonly CommonPose[],
  config: PoseMatchConfig = DEFAULT_POSE_MATCH_CONFIG,
): PoseSceneMatchResult {
  const { assignments, unmatchedTargetIndices, unmatchedLiveIndices } =
    assignPoses(targets, livePoses, config);
  const personCountMatches = targets.length === livePoses.length;
  const allPeopleAligned =
    targets.length > 0 &&
    assignments.length === targets.length &&
    assignments.every(({ match }) => match.isAligned);
  const aligned = personCountMatches && allPeopleAligned;
  const worstAssignment = findWorstAssignment(assignments);
  const worstCause = worstAssignment
    ? getLargestPairMismatch(worstAssignment.match)
    : null;
  const sceneScore =
    personCountMatches && assignments.length > 0
      ? Math.min(...assignments.map(({ score }) => score))
      : 0;

  if (livePoses.length === 0) {
    return {
      aligned: false,
      sceneScore,
      feedback: "NO_PERSON",
      assignments,
      unmatchedTargetIndices,
      unmatchedLiveIndices,
      worstMatch: null,
      largestMismatch: "NO_PERSON",
    };
  }

  const worstMatch =
    worstAssignment && worstCause
      ? {
          targetIndex: worstAssignment.targetIndex,
          liveIndex: worstAssignment.liveIndex,
          score: worstAssignment.score,
          cause: worstCause,
        }
      : null;

  if (!personCountMatches) {
    return {
      aligned: false,
      sceneScore,
      feedback: "PERSON_COUNT_MISMATCH",
      assignments,
      unmatchedTargetIndices,
      unmatchedLiveIndices,
      worstMatch,
      largestMismatch: "PERSON_COUNT",
    };
  }

  return {
    aligned,
    sceneScore,
    feedback:
      aligned || !worstAssignment || !worstCause
        ? "ALIGNED"
        : getFeedback(worstAssignment.match, worstCause, config),
    assignments,
    unmatchedTargetIndices,
    unmatchedLiveIndices,
    worstMatch,
    largestMismatch: aligned ? null : worstCause,
  };
}
