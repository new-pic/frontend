import type { FeedAiProcessingLifecycle } from "../processing/feed-processing-types";
import type { FeedPublishingTask } from "../publishing/feed-publishing-types";

export function getPublishingCompletionHapticKey(
  task: FeedPublishingTask | null,
) {
  if (
    !task ||
    task.command.kind !== "UPDATE" ||
    task.publishingPhase !== "completed"
  ) {
    return null;
  }
  return `publishing:${task.publishingTaskId}`;
}

export function getProcessingCompletionHapticKey(
  processingLifecycle: FeedAiProcessingLifecycle | null,
) {
  if (
    !processingLifecycle ||
    processingLifecycle.processingPhase !== "completed" ||
    processingLifecycle.feedListSyncState !== "succeeded"
  ) {
    return null;
  }
  return `processing:${processingLifecycle.jobId}`;
}

export function claimFeedCompletionHaptic(
  handledKeys: Set<string>,
  completionKey: string | null,
  isAppActive: boolean,
) {
  if (!completionKey || handledKeys.has(completionKey)) return false;

  handledKeys.add(completionKey);
  return isAppActive;
}
