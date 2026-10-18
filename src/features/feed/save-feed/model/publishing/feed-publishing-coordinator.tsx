import {
  CreateFeedRequestSchema,
  UpdateFeedRequestSchema,
} from "@entities/feed";
import { getApiErrorMessage } from "@shared/api";
import { deleteStagedUploadFile, useAppTranslation } from "@shared/lib";
import { File } from "expo-file-system";
import { useEffect } from "react";
import { useFeedProcessingStore } from "../processing/feed-processing-store";
import { useFeedPublishingStore } from "./feed-publishing-store";
import { feedPublishingQuery } from "../../api";

export function FeedPublishingCoordinator() {
  const { t } = useAppTranslation();
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
          publishingStore.setPublishingPhase(publishingTaskId, "uploading");
          const request = CreateFeedRequestSchema.parse({
            image: new File(command.image.uri),
            description: command.description,
            tags: command.tags,
          });
          const job = await createFeedMutation.mutateAsync(request);

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
        const action =
          command.kind === "CREATE"
            ? t("feed.publishing.createAction")
            : t("feed.publishing.updateAction");
        const message = getApiErrorMessage(
          error,
          t("feed.publishing.failed", { action }),
        );
        useFeedPublishingStore
          .getState()
          .markPublishingFailed(publishingTaskId, message);
      }
    };

    void publish();
  }, [createFeedMutation, publishingTask, t, updateFeedMutation]);

  return null;
}
