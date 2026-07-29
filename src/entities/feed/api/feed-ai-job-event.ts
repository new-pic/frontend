import type { FeedAiJobProgressEventDto } from "../model";
import type { SseMessage } from "./sse-parser";

export type FeedAiJobEvent =
  | {
      type: "progress";
      data: FeedAiJobProgressEventDto;
    }
  | {
      type: "completed";
    }
  | {
      type: "failed";
    };

const FEED_AI_JOB_STATUSES = new Set([
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

function isFeedAiJobProgressEventDto(
  value: unknown,
): value is FeedAiJobProgressEventDto {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.jobId === "string" &&
    typeof candidate.status === "string" &&
    FEED_AI_JOB_STATUSES.has(candidate.status) &&
    typeof candidate.progressPercent === "number" &&
    typeof candidate.estimatedRemainingSeconds === "number" &&
    typeof candidate.isCompleted === "boolean"
  );
}

export function parseFeedAiJobEvent(
  message: SseMessage,
): FeedAiJobEvent | null {
  if (message.event === "completed") {
    return { type: "completed" };
  }
  if (message.event === "failed") {
    return { type: "failed" };
  }
  if (message.event !== "progress") {
    return null;
  }

  try {
    const data: unknown = JSON.parse(message.data);
    return isFeedAiJobProgressEventDto(data)
      ? { type: "progress", data }
      : null;
  } catch {
    return null;
  }
}
