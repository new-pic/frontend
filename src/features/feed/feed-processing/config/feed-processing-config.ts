export const FEED_PROCESSING_CONFIG = {
  pollingIntervalMs: 2_500,
  completedBadgeDurationMs: 8_000,
  progressDisplayTickMs: 250,
  interpolatedProgressCeilingPercent: 95,
  processingProgressMaximumPercent: 99,
  minimumEstimatedRemainingSeconds: 1,
} as const;
