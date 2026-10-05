const FEED_PROCESSING_DEBUG_PREFIX = "[FeedProcessingDebug]";

type FeedProcessingDebugDetails = Record<string, unknown>;

interface ErrorLike {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  response?: {
    status?: unknown;
  };
}

export function summarizeFeedProcessingError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const candidate = error as ErrorLike;

  return {
    name: typeof candidate.name === "string" ? candidate.name : undefined,
    message:
      typeof candidate.message === "string"
        ? candidate.message
        : "Unknown error",
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    status:
      typeof candidate.response?.status === "number"
        ? candidate.response.status
        : undefined,
  };
}

export function createFeedProcessingDataPreview(data: string) {
  const normalized = data.replace(/\s+/g, " ").trim();
  return normalized.length > 300 ? `${normalized.slice(0, 300)}…` : normalized;
}

export function logFeedProcessingDebug(
  scope: string,
  event: string,
  details: FeedProcessingDebugDetails = {},
) {
  console.info(`${FEED_PROCESSING_DEBUG_PREFIX}[${scope}] ${event}`, details);
}

export function warnFeedProcessingDebug(
  scope: string,
  event: string,
  details: FeedProcessingDebugDetails = {},
) {
  console.warn(`${FEED_PROCESSING_DEBUG_PREFIX}[${scope}] ${event}`, details);
}

export function errorFeedProcessingDebug(
  scope: string,
  event: string,
  details: FeedProcessingDebugDetails = {},
) {
  console.error(`${FEED_PROCESSING_DEBUG_PREFIX}[${scope}] ${event}`, details);
}
