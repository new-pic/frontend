import {
  CreateFeedRequestSchema,
  UpdateFeedRequestSchema,
} from "@entities/feed";
import { getApiErrorMessage } from "@shared/api";
import { deleteStagedUploadFile } from "@shared/lib";
import { File } from "expo-file-system";
import { useEffect } from "react";
import { useFeedProcessingStore } from "../processing/feed-processing-store";
import { useFeedPublishingStore } from "./feed-publishing-store";
import { feedPublishingQuery } from "../../api";
import {
  errorFeedProcessingDebug,
  logFeedProcessingDebug,
  summarizeFeedProcessingError,
} from "../../lib/feed-processing-debug";

export function FeedPublishingCoordinator() {
  const publishingTask = useFeedPublishingStore(
    (state) => state.publishingTask,
  );
  const createFeedMutation = feedPublishingQuery.useCreateFeed();
  const updateFeedMutation = feedPublishingQuery.useUpdateFeed({
    feedId:
      publishingTask?.command.kind === "UPDATE"
        ? publishingTask.command.feedId
        : undefined,
  });

  useEffect(() => {
    if (!publishingTask || publishingTask.publishingPhase !== "queued") return;

    const { publishingTaskId, command } = publishingTask;
    const publishingStore = useFeedPublishingStore.getState();

    const publish = async () => {
      try {
        if (command.kind === "CREATE") {
          logFeedProcessingDebug("Publishing", "upload-started", {
            publishingTaskId,
            tagCount: command.tags.length,
          });
          publishingStore.setPublishingPhase(publishingTaskId, "uploading");
          const request = CreateFeedRequestSchema.parse({
            image: new File(command.image.uri),
            description: command.description,
            tags: command.tags,
          });
          const job = await createFeedMutation.mutateAsync(request);

          logFeedProcessingDebug("Publishing", "job-created", {
            publishingTaskId,
            jobId: job.jobId,
            feedId: job.feedId,
            status: job.status,
            progressPercent: job.progressPercent,
          });

          useFeedProcessingStore.getState().startProcessing(job);
          deleteStagedUploadFile(command.image);
          useFeedPublishingStore.getState().dismissPublishing(publishingTaskId);
          return;
        }

        publishingStore.setPublishingPhase(publishingTaskId, "updating");
        const request = UpdateFeedRequestSchema.parse({
          description: command.description,
          tags: command.tags,
        });
        await updateFeedMutation.mutateAsync(request);
        useFeedPublishingStore
          .getState()
          .setPublishingPhase(publishingTaskId, "completed");
      } catch (error) {
        const action = command.kind === "CREATE" ? "게시" : "수정";
        errorFeedProcessingDebug("Publishing", "request-failed", {
          publishingTaskId,
          commandKind: command.kind,
          error: summarizeFeedProcessingError(error),
        });
        const message = getApiErrorMessage(
          error,
          `피드를 ${action}하지 못했습니다. 잠시 후 다시 시도해주세요.`,
        );
        useFeedPublishingStore
          .getState()
          .markPublishingFailed(publishingTaskId, message);
      }
    };

    void publish();
  }, [createFeedMutation, publishingTask, updateFeedMutation]);

  return null;
}
