import type {
  PoseAssignment,
  PoseFeedback,
  PoseSceneMatchResult,
} from "../../pose-matching";
import {
  DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
  type PoseGuideFeedbackConfig,
} from "./pose-guide-feedback-config";

export type CameraGuideAlignmentState =
  | "SEARCHING"
  | "MISALIGNED"
  | "ALIGNED";

export type FeedbackPersonPosition =
  | "LEFT"
  | "CENTER"
  | "RIGHT";

export interface PoseGuideFeedbackDescriptor {
  reason: PoseFeedback;
  personPosition: FeedbackPersonPosition | null;
  targetPersonCount: number;
  livePersonCount: number;
}

export interface PoseGuideAlignmentSnapshot {
  guideId: string | null;
  active: boolean;
  alignmentState: CameraGuideAlignmentState | null;
  smoothedOverallScore: number | null;
  feedback: PoseGuideFeedbackDescriptor | null;
}

export interface PoseGuideAlignmentPolicyState
  extends PoseGuideAlignmentSnapshot {
  targetReady: boolean;
  stableSampleCount: number;
  noPoseSinceMs: number | null;
  pendingFeedback: PoseGuideFeedbackDescriptor | null;
  pendingFeedbackSinceMs: number | null;
  lastFeedbackChangeMs: number | null;
}

export interface PoseGuideMatchObservation {
  result: PoseSceneMatchResult;
  targetPersonCount: number;
  livePersonCount: number;
  nowMs: number;
}

function isSameFeedback(
  left: PoseGuideFeedbackDescriptor | null,
  right: PoseGuideFeedbackDescriptor | null,
) {
  return (
    left?.reason === right?.reason &&
    left?.personPosition === right?.personPosition &&
    left?.targetPersonCount === right?.targetPersonCount &&
    left?.livePersonCount === right?.livePersonCount
  );
}

function findWorstAssignment(
  result: PoseSceneMatchResult,
): PoseAssignment | undefined {
  const worst = result.worstMatch;
  if (!worst) return undefined;

  return result.assignments.find(
    ({ targetIndex, liveIndex }) =>
      targetIndex === worst.targetIndex &&
      liveIndex === worst.liveIndex,
  );
}

function resolvePersonPosition(
  result: PoseSceneMatchResult,
  livePersonCount: number,
  config: PoseGuideFeedbackConfig,
): FeedbackPersonPosition | null {
  if (livePersonCount <= 1) return null;

  const assignment = findWorstAssignment(result);
  const x = assignment?.match.metrics?.liveCenter.x;
  if (x === undefined) return null;

  if (x < config.personPositionBoundaries.leftMaxX) {
    return "LEFT";
  }
  if (x > config.personPositionBoundaries.rightMinX) {
    return "RIGHT";
  }
  return "CENTER";
}

function createFeedbackDescriptor(
  result: PoseSceneMatchResult,
  targetPersonCount: number,
  livePersonCount: number,
  config: PoseGuideFeedbackConfig,
): PoseGuideFeedbackDescriptor | null {
  if (result.feedback === "ALIGNED") return null;

  return {
    reason: result.feedback,
    personPosition: resolvePersonPosition(
      result,
      livePersonCount,
      config,
    ),
    targetPersonCount,
    livePersonCount,
  };
}

function withFeedbackCandidate(
  state: PoseGuideAlignmentPolicyState,
  candidate: PoseGuideFeedbackDescriptor | null,
  nowMs: number,
  config: PoseGuideFeedbackConfig,
): PoseGuideAlignmentPolicyState {
  if (candidate === null) {
    if (
      state.feedback === null &&
      state.pendingFeedback === null
    ) {
      return state;
    }

    return {
      ...state,
      feedback: null,
      pendingFeedback: null,
      pendingFeedbackSinceMs: null,
      lastFeedbackChangeMs:
        state.feedback === null
          ? state.lastFeedbackChangeMs
          : nowMs,
    };
  }

  if (isSameFeedback(candidate, state.feedback)) {
    if (state.pendingFeedback === null) return state;
    return {
      ...state,
      pendingFeedback: null,
      pendingFeedbackSinceMs: null,
    };
  }

  if (!isSameFeedback(candidate, state.pendingFeedback)) {
    return {
      ...state,
      pendingFeedback: candidate,
      pendingFeedbackSinceMs: nowMs,
    };
  }

  const pendingForMs =
    nowMs - (state.pendingFeedbackSinceMs ?? nowMs);
  const sinceLastChangeMs =
    state.lastFeedbackChangeMs === null
      ? Number.POSITIVE_INFINITY
      : nowMs - state.lastFeedbackChangeMs;
  if (
    pendingForMs < config.feedbackDebounceMs ||
    sinceLastChangeMs < config.feedbackCooldownMs
  ) {
    return state;
  }

  return {
    ...state,
    feedback: candidate,
    pendingFeedback: null,
    pendingFeedbackSinceMs: null,
    lastFeedbackChangeMs: nowMs,
  };
}

export function createPoseGuideAlignmentPolicyState(
  guideId: string | null,
  targetReady: boolean,
): PoseGuideAlignmentPolicyState {
  return {
    guideId,
    active: guideId !== null,
    targetReady,
    alignmentState: guideId === null ? null : "SEARCHING",
    smoothedOverallScore: null,
    feedback: null,
    stableSampleCount: 0,
    noPoseSinceMs: null,
    pendingFeedback: null,
    pendingFeedbackSinceMs: null,
    lastFeedbackChangeMs: null,
  };
}

export function resetPoseGuideAlignmentPolicy(
  state: PoseGuideAlignmentPolicyState,
  guideId: string | null,
  targetReady: boolean,
): PoseGuideAlignmentPolicyState {
  if (
    state.guideId === guideId &&
    state.targetReady === targetReady
  ) {
    return state;
  }

  return createPoseGuideAlignmentPolicyState(
    guideId,
    targetReady,
  );
}

export function advancePoseGuideAlignmentPolicy(
  state: PoseGuideAlignmentPolicyState,
  observation: PoseGuideMatchObservation,
  config: PoseGuideFeedbackConfig = DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
): PoseGuideAlignmentPolicyState {
  if (!state.active || !state.targetReady) return state;

  const { result, targetPersonCount, livePersonCount, nowMs } =
    observation;
  const isIncompletePose =
    result.feedback === "NO_PERSON" ||
    result.feedback === "LOW_CONFIDENCE";

  if (isIncompletePose) {
    const noPoseSinceMs = state.noPoseSinceMs ?? nowMs;
    if (nowMs - noPoseSinceMs < config.noPoseGraceMs) {
      return {
        ...state,
        noPoseSinceMs,
      };
    }

    const searchingState: PoseGuideAlignmentPolicyState = {
      ...state,
      alignmentState: "SEARCHING",
      smoothedOverallScore: null,
      stableSampleCount: 0,
      noPoseSinceMs,
    };
    return withFeedbackCandidate(
      searchingState,
      createFeedbackDescriptor(
        result,
        targetPersonCount,
        livePersonCount,
        config,
      ),
      nowMs,
      config,
    );
  }

  const smoothedOverallScore =
    state.smoothedOverallScore === null
      ? result.sceneScore
      : config.scoreEmaAlpha * result.sceneScore +
        (1 - config.scoreEmaAlpha) *
          state.smoothedOverallScore;
  const stableSampleCount = state.stableSampleCount + 1;
  let alignmentState = state.alignmentState ?? "SEARCHING";

  if (stableSampleCount < config.minimumStableSamples) {
    alignmentState = "SEARCHING";
  } else if (alignmentState === "ALIGNED") {
    if (smoothedOverallScore < config.warningThreshold) {
      alignmentState = "MISALIGNED";
    }
  } else if (
    result.aligned &&
    smoothedOverallScore >= config.recoveryThreshold
  ) {
    alignmentState = "ALIGNED";
  } else {
    alignmentState = "MISALIGNED";
  }

  const nextState: PoseGuideAlignmentPolicyState = {
    ...state,
    alignmentState,
    smoothedOverallScore,
    stableSampleCount,
    noPoseSinceMs: null,
  };

  return withFeedbackCandidate(
    nextState,
    alignmentState === "MISALIGNED"
      ? (createFeedbackDescriptor(
          result,
          targetPersonCount,
          livePersonCount,
          config,
        ) ?? state.feedback)
      : alignmentState === "ALIGNED"
        ? null
        : state.feedback,
    nowMs,
    config,
  );
}

export function toPoseGuideAlignmentSnapshot(
  state: PoseGuideAlignmentPolicyState,
): PoseGuideAlignmentSnapshot {
  return {
    guideId: state.guideId,
    active: state.active,
    alignmentState: state.alignmentState,
    smoothedOverallScore: state.smoothedOverallScore,
    feedback: state.feedback,
  };
}
