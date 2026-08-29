import type { FeedPublishingTask } from "./feed-publishing-types";
import type { FeedProcessingJob } from "./types";

export function getPublishingCompletionHapticKey(
  task: FeedPublishingTask | null,
) {
  if (
    !task ||
    task.command.kind !== "UPDATE" ||
    task.phase !== "completed"
  ) {
    return null;
  }
  return `publishing:${task.id}`;
}

export function getProcessingCompletionHapticKey(
  job: FeedProcessingJob | null,
) {
  if (
    !job ||
    job.phase !== "completed" ||
    job.listRefreshState !== "succeeded"
  ) {
    return null;
  }
  return `processing:${job.jobId}`;
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
