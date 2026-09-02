import { useFeedProcessingStore } from "../processing/feed-processing-store";
import { useFeedPublishingStore } from "../publishing/feed-publishing-store";
import { isFeedPublishingPipelineActive } from "./feed-publishing-pipeline-state";

export function useFeedPublishingPipelineActive() {
  const publishingTask = useFeedPublishingStore(
    (state) => state.publishingTask,
  );
  const processingLifecycle = useFeedProcessingStore(
    (state) => state.processingLifecycle,
  );
  return isFeedPublishingPipelineActive(publishingTask, processingLifecycle);
}
