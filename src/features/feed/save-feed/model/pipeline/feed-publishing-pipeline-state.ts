import type { FeedAiProcessingLifecycle } from "../processing/feed-processing-types";
import type {
  FeedPublishingPhase,
  FeedPublishingTask,
} from "../publishing/feed-publishing-types";

export function isFeedPublishingPhaseActive(phase: FeedPublishingPhase) {
  return phase === "queued" || phase === "uploading" || phase === "updating";
}

export function isFeedPublishingTaskActive(task: FeedPublishingTask | null) {
  return task ? isFeedPublishingPhaseActive(task.publishingPhase) : false;
}

export function isFeedProcessingLifecycleActive(
  processingLifecycle: FeedAiProcessingLifecycle | null,
) {
  if (!processingLifecycle) return false;
  if (processingLifecycle.processingPhase === "processing") return true;

  return (
    processingLifecycle.processingPhase === "completed" &&
    (processingLifecycle.feedListSyncState === "idle" ||
      processingLifecycle.feedListSyncState === "pending")
  );
}

export function isFeedPublishingPipelineActive(
  publishingTask: FeedPublishingTask | null,
  processingLifecycle: FeedAiProcessingLifecycle | null,
) {
  const isTaskBlocking = publishingTask
    ? publishingTask.publishingPhase !== "completed"
    : false;
  return isTaskBlocking || isFeedProcessingLifecycleActive(processingLifecycle);
}
