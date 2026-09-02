import type {
  FeedAiJobProgressEventDto,
  FeedAiJobResponseDto,
  FeedAiJobStatusResponseDto,
} from "@entities/feed";
import type {
  FeedAiProcessingLifecycle,
  FeedProcessingPhase,
} from "./feed-processing-types";

function clampProgress(progressPercent: number) {
  return Math.min(100, Math.max(0, progressPercent));
}

export function adaptFeedAiJobPhase(
  status: FeedAiJobResponseDto["status"],
): FeedProcessingPhase {
  if (status === "COMPLETED") return "completed";
  if (status === "FAILED") return "failed";
  return "processing";
}

export function adaptCreatedFeedAiJob(
  dto: FeedAiJobResponseDto,
): FeedAiProcessingLifecycle {
  return {
    jobId: dto.jobId,
    feedId: dto.feedId,
    processingPhase: adaptFeedAiJobPhase(dto.status),
    serverProgressPercent: clampProgress(dto.progressPercent),
    estimatedRemainingSeconds: dto.estimatedRemainingSeconds,
    monitoringState: "idle",
    feedListSyncState: "idle",
  };
}

export function adaptFeedAiJobStatus(
  dto: FeedAiJobStatusResponseDto,
): Pick<
  FeedAiProcessingLifecycle,
  "processingPhase" | "serverProgressPercent"
> {
  return {
    processingPhase: adaptFeedAiJobPhase(dto.status),
    serverProgressPercent: clampProgress(dto.progressPercent),
  };
}

export function adaptFeedAiJobProgress(
  dto: FeedAiJobProgressEventDto,
): Pick<
  FeedAiProcessingLifecycle,
  "processingPhase" | "serverProgressPercent" | "estimatedRemainingSeconds"
> {
  return {
    processingPhase: adaptFeedAiJobPhase(dto.status),
    serverProgressPercent: clampProgress(dto.progressPercent),
    estimatedRemainingSeconds: dto.estimatedRemainingSeconds,
  };
}
