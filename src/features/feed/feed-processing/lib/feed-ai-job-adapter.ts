import type {
  FeedAiJobProgressEventDto,
  FeedAiJobResponseDto,
  FeedAiJobStatusResponseDto,
} from "@entities/feed";
import type {
  FeedProcessingJob,
  FeedProcessingPhase,
} from "../model/types";

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
): FeedProcessingJob {
  return {
    jobId: dto.jobId,
    feedId: dto.feedId,
    phase: adaptFeedAiJobPhase(dto.status),
    serverProgressPercent: clampProgress(dto.progressPercent),
    estimatedRemainingSeconds: dto.estimatedRemainingSeconds,
    transportState: "idle",
    listRefreshState: "idle",
  };
}

export function adaptFeedAiJobStatus(
  dto: FeedAiJobStatusResponseDto,
): Pick<FeedProcessingJob, "phase" | "serverProgressPercent"> {
  return {
    phase: adaptFeedAiJobPhase(dto.status),
    serverProgressPercent: clampProgress(dto.progressPercent),
  };
}

export function adaptFeedAiJobProgress(
  dto: FeedAiJobProgressEventDto,
): Pick<
  FeedProcessingJob,
  "phase" | "serverProgressPercent" | "estimatedRemainingSeconds"
> {
  return {
    phase: adaptFeedAiJobPhase(dto.status),
    serverProgressPercent: clampProgress(dto.progressPercent),
    estimatedRemainingSeconds: dto.estimatedRemainingSeconds,
  };
}
