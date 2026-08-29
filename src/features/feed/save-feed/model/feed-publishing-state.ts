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
  const isTaskBlocking = task ? task.phase !== "completed" : false;
  return isTaskBlocking || isFeedProcessingJobActive(job);
}
