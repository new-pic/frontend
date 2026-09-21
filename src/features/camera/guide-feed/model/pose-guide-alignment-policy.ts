import type {
  PoseAssignment,
  PoseFeedback,
  PoseSceneMatchResult,
} from "./pose-types";
import {
  DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
  type PoseGuideFeedbackConfig,
} from "./pose-guide-feedback-config";

export type CameraGuideAlignmentState = "SEARCHING" | "MISALIGNED" | "ALIGNED";

export type FeedbackPersonPosition = "LEFT" | "CENTER" | "RIGHT";

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
  feedback: PoseGuideFeedbackDescriptor | null;
}

export interface PoseGuideAlignmentPolicyState extends PoseGuideAlignmentSnapshot {
  targetReady: boolean;
  smoothedOverallScore: number | null;
  trackingSinceMs: number | null;
  alignedCandidateSinceMs: number | null;
  misalignedCandidateSinceMs: number | null;
  lastFrameObservationMs: number | null;
  lastScoreObservationMs: number | null;
  noPoseSinceMs: number | null;
  pendingFeedback: PoseGuideFeedbackDescriptor | null;
  pendingFeedbackSinceMs: number | null;
  lastFeedbackChangeMs: number | null;
}

function getScoreEmaAlpha(
  previousObservationMs: number | null,
  nowMs: number,
  timeConstantMs: number,
) {
  if (previousObservationMs === null || timeConstantMs <= 0) return 1;

  const elapsedMs = Math.max(0, nowMs - previousObservationMs);
  return 1 - Math.exp(-elapsedMs / timeConstantMs);
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
      targetIndex === worst.targetIndex && liveIndex === worst.liveIndex,
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
    personPosition: resolvePersonPosition(result, livePersonCount, config),
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
    if (state.feedback === null && state.pendingFeedback === null) {
      return state;
    }

    return {
      ...state,
      feedback: null,
      pendingFeedback: null,
      pendingFeedbackSinceMs: null,
      lastFeedbackChangeMs:
        state.feedback === null ? state.lastFeedbackChangeMs : nowMs,
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

  const pendingForMs = nowMs - (state.pendingFeedbackSinceMs ?? nowMs);
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
    trackingSinceMs: null,
    alignedCandidateSinceMs: null,
    misalignedCandidateSinceMs: null,
    lastFrameObservationMs: null,
    lastScoreObservationMs: null,
    noPoseSinceMs: null,
    pendingFeedback: null,
    pendingFeedbackSinceMs: null,
    lastFeedbackChangeMs: null,
  };
}

export function resetPoseGuideAlignmentTracking(
  state: PoseGuideAlignmentPolicyState,
): PoseGuideAlignmentPolicyState {
  return {
    ...state,
    alignmentState: state.active ? "SEARCHING" : null,
    smoothedOverallScore: null,
    feedback: null,
    trackingSinceMs: null,
    alignedCandidateSinceMs: null,
    misalignedCandidateSinceMs: null,
    lastFrameObservationMs: null,
    lastScoreObservationMs: null,
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
  if (state.guideId === guideId && state.targetReady === targetReady) {
    return state;
  }

  return createPoseGuideAlignmentPolicyState(guideId, targetReady);
}

export function advancePoseGuideAlignmentClock(
  state: PoseGuideAlignmentPolicyState,
  nowMs: number,
  config: PoseGuideFeedbackConfig = DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
): PoseGuideAlignmentPolicyState {
  if (
    !state.active ||
    !state.targetReady ||
    state.lastFrameObservationMs === null ||
    nowMs - state.lastFrameObservationMs < config.noFrameTimeoutMs
  ) {
    return state;
  }

  return resetPoseGuideAlignmentTracking(state);
}

export function advancePoseGuideAlignmentPolicy(
  state: PoseGuideAlignmentPolicyState,
  observation: PoseGuideMatchObservation,
  config: PoseGuideFeedbackConfig = DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
): PoseGuideAlignmentPolicyState {
  if (!state.active || !state.targetReady) return state;

  const { result, targetPersonCount, livePersonCount, nowMs } = observation;
  const isIncompletePose =
    result.feedback === "NO_PERSON" || result.feedback === "LOW_CONFIDENCE";

  if (isIncompletePose) {
    const noPoseSinceMs = state.noPoseSinceMs ?? nowMs;
    if (nowMs - noPoseSinceMs < config.noPoseGraceMs) {
      return {
        ...state,
        alignedCandidateSinceMs: null,
        misalignedCandidateSinceMs: null,
        lastFrameObservationMs: nowMs,
        noPoseSinceMs,
      };
    }

    const searchingState: PoseGuideAlignmentPolicyState = {
      ...state,
      alignmentState: "SEARCHING",
      smoothedOverallScore: null,
      trackingSinceMs: null,
      alignedCandidateSinceMs: null,
      misalignedCandidateSinceMs: null,
      lastFrameObservationMs: nowMs,
      lastScoreObservationMs: null,
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

  const scoreEmaAlpha = getScoreEmaAlpha(
    state.lastScoreObservationMs,
    nowMs,
    config.scoreEmaTimeConstantMs,
  );
  const smoothedOverallScore =
    state.smoothedOverallScore === null
      ? result.sceneScore
      : scoreEmaAlpha * result.sceneScore +
        (1 - scoreEmaAlpha) * state.smoothedOverallScore;
  const trackingSinceMs = state.trackingSinceMs ?? nowMs;
  let alignmentState = state.alignmentState ?? "SEARCHING";
  let alignedCandidateSinceMs = state.alignedCandidateSinceMs;
  let misalignedCandidateSinceMs = state.misalignedCandidateSinceMs;
  const isAlignmentCandidate =
    result.aligned && smoothedOverallScore >= config.recoveryThreshold;
  const isMisalignmentCandidate =
    !result.aligned || smoothedOverallScore < config.warningThreshold;

  if (alignmentState === "ALIGNED") {
    alignedCandidateSinceMs = null;
    if (isMisalignmentCandidate) {
      misalignedCandidateSinceMs ??= nowMs;
      if (nowMs - misalignedCandidateSinceMs >= config.alignmentExitHoldMs) {
        alignmentState = "MISALIGNED";
        misalignedCandidateSinceMs = null;
      }
    } else {
      misalignedCandidateSinceMs = null;
    }
  } else if (isAlignmentCandidate) {
    misalignedCandidateSinceMs = null;
    alignedCandidateSinceMs ??= nowMs;
    if (nowMs - alignedCandidateSinceMs >= config.alignmentEnterHoldMs) {
      alignmentState = "ALIGNED";
      alignedCandidateSinceMs = null;
    } else {
      alignmentState = "SEARCHING";
    }
  } else {
    alignedCandidateSinceMs = null;
    misalignedCandidateSinceMs = null;
    if (nowMs - trackingSinceMs >= config.initialObservationHoldMs) {
      alignmentState = "MISALIGNED";
    } else {
      alignmentState = "SEARCHING";
    }
  }

  const nextState: PoseGuideAlignmentPolicyState = {
    ...state,
    alignmentState,
    smoothedOverallScore,
    trackingSinceMs,
    alignedCandidateSinceMs,
    misalignedCandidateSinceMs,
    lastFrameObservationMs: nowMs,
    lastScoreObservationMs: nowMs,
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
    feedback: state.feedback,
  };
}
