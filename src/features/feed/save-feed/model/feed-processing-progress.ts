import { FEED_PROCESSING_CONFIG } from "../config/feed-processing-config";

export interface FeedProcessingProgressInput {
  serverProgressPercent: number;
  estimatedRemainingSeconds?: number;
  progressEstimateUpdatedAt?: number;
}

export interface FeedProcessingProgressProjection {
  anchorPercent: number;
  anchorTimeMs: number;
  estimatedEndTimeMs?: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeProcessingServerProgress(progressPercent: number) {
  return clamp(
    progressPercent,
    0,
    FEED_PROCESSING_CONFIG.processingProgressMaximumPercent,
  );
}

function getEstimatedEndTimeMs(input: FeedProcessingProgressInput) {
  if (
    input.progressEstimateUpdatedAt === undefined ||
    input.estimatedRemainingSeconds === undefined ||
    !Number.isFinite(input.estimatedRemainingSeconds)
  ) {
    return undefined;
  }

  const remainingSeconds = Math.max(
    FEED_PROCESSING_CONFIG.minimumEstimatedRemainingSeconds,
    input.estimatedRemainingSeconds,
  );
  return input.progressEstimateUpdatedAt + remainingSeconds * 1_000;
}

export function createFeedProcessingProgressProjection(
  input: FeedProcessingProgressInput,
  now: number,
): FeedProcessingProgressProjection {
  return {
    anchorPercent: normalizeProcessingServerProgress(
      input.serverProgressPercent,
    ),
    anchorTimeMs: input.progressEstimateUpdatedAt ?? now,
    estimatedEndTimeMs: getEstimatedEndTimeMs(input),
  };
}

export function projectFeedProcessingProgress(
  projection: FeedProcessingProgressProjection,
  now: number,
) {
  const { anchorPercent, anchorTimeMs, estimatedEndTimeMs } = projection;
  if (estimatedEndTimeMs === undefined) return anchorPercent;

  const targetPercent = Math.max(
    anchorPercent,
    FEED_PROCESSING_CONFIG.interpolatedProgressCeilingPercent,
  );
  if (estimatedEndTimeMs <= anchorTimeMs) return targetPercent;

  const elapsedRatio = clamp(
    (now - anchorTimeMs) / (estimatedEndTimeMs - anchorTimeMs),
    0,
    1,
  );
  return clamp(
    anchorPercent + (targetPercent - anchorPercent) * elapsedRatio,
    anchorPercent,
    FEED_PROCESSING_CONFIG.processingProgressMaximumPercent,
  );
}

export function rebaseFeedProcessingProgressProjection(
  current: FeedProcessingProgressProjection,
  input: FeedProcessingProgressInput,
  now: number,
): FeedProcessingProgressProjection {
  const currentDisplayPercent = projectFeedProcessingProgress(current, now);
  const serverProgressPercent = normalizeProcessingServerProgress(
    input.serverProgressPercent,
  );

  return {
    anchorPercent: Math.max(currentDisplayPercent, serverProgressPercent),
    anchorTimeMs: now,
    estimatedEndTimeMs:
      getEstimatedEndTimeMs(input) ?? current.estimatedEndTimeMs,
  };
}
