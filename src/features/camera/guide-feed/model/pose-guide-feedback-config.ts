export interface PoseGuideFeedbackConfig {
  scoreEmaAlpha: number;
  minimumStableSamples: number;
  warningThreshold: number;
  recoveryThreshold: number;
  noPoseGraceMs: number;
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
  scoreEmaAlpha: 0.3,
  minimumStableSamples: 3,
  warningThreshold: 78,
  recoveryThreshold: 85,
  noPoseGraceMs: 800,
  feedbackDebounceMs: 350,
  feedbackCooldownMs: 800,
  personPositionBoundaries: {
    leftMaxX: 0.4,
    rightMinX: 0.6,
  },
};
