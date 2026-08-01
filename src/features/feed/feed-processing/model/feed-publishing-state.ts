import type { FeedProcessingJob } from "./types";
import type {
  FeedPublishingPhase,
  FeedPublishingTask,
} from "./feed-publishing-types";

export function isFeedPublishingPhaseActive(phase: FeedPublishingPhase) {
  return phase === "queued" || phase === "uploading" || phase === "updating";
}

export function isFeedPublishingTaskActive(task: FeedPublishingTask | null) {
  return task ? isFeedPublishingPhaseActive(task.phase) : false;
}

export function isFeedProcessingJobActive(job: FeedProcessingJob | null) {
  if (!job) return false;
  if (job.phase === "processing") return true;

  return (
    job.phase === "completed" &&
    (job.listRefreshState === "idle" || job.listRefreshState === "pending")
  );
}

export function isFeedPublishingPipelineActive(
  task: FeedPublishingTask | null,
  job: FeedProcessingJob | null,
) {
  // 실패/완료 task도 사용자가 재시도하거나 닫기 전까지 단일 슬롯을 점유합니다.
  return task !== null || isFeedProcessingJobActive(job);
}
