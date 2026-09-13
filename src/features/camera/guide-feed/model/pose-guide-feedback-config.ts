export interface PoseGuideFeedbackConfig {
  scoreEmaTimeConstantMs: number;
  initialObservationHoldMs: number;
  alignmentEnterHoldMs: number;
  alignmentExitHoldMs: number;
  warningThreshold: number;
  recoveryThreshold: number;
  noPoseGraceMs: number;
  noFrameTimeoutMs: number;
  feedbackDebounceMs: number;
  feedbackCooldownMs: number;
  personPositionBoundaries: {
    leftMaxX: number;
    rightMinX: number;
  };
}

/**
 * Initial UI calibration parameters.
 *
 * These values stabilize PoseMatcher output for presentation only. They must
 * be calibrated again with real devices, camera positions, and multiple
 * people before release.
 */
export const DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG: PoseGuideFeedbackConfig = {
  // Equivalent to alpha ~= 0.3 at 10 FPS, but stable across frame rates.
  scoreEmaTimeConstantMs: 280,
  initialObservationHoldMs: 200,
  alignmentEnterHoldMs: 200,
  alignmentExitHoldMs: 200,
  warningThreshold: 78,
  recoveryThreshold: 85,
  noPoseGraceMs: 800,
  noFrameTimeoutMs: 1_200,
  feedbackDebounceMs: 350,
  feedbackCooldownMs: 800,
  personPositionBoundaries: {
    leftMaxX: 0.4,
    rightMinX: 0.6,
  },
};
