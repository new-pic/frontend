import { useFeedProcessingStore } from "./feed-processing-store";
import { useFeedPublishingStore } from "./feed-publishing-store";
import { isFeedPublishingPipelineActive } from "./feed-publishing-state";

export function useFeedPublishingPipelineActive() {
  const task = useFeedPublishingStore((state) => state.task);
  const job = useFeedProcessingStore((state) => state.job);
  return isFeedPublishingPipelineActive(task, job);
}
