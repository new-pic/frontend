import {
  CreateFeedRequestSchema,
  UpdateFeedRequestSchema,
} from "@entities/feed";
import { getApiErrorMessage } from "@shared/api";
import { deleteStagedUploadFile } from "@shared/lib";
import { File } from "expo-file-system";
import { useEffect } from "react";
import { useFeedProcessingStore } from "./feed-processing-store";
import { useFeedPublishingStore } from "./feed-publishing-store";
import { feedPublishingQuery } from "../api";

export function FeedPublishingCoordinator() {
  const task = useFeedPublishingStore((state) => state.task);
  const createFeedMutation = feedPublishingQuery.useCreateFeed();
  const updateFeedMutation = feedPublishingQuery.useUpdateFeed({
    feedId: task?.command.kind === "UPDATE" ? task.command.feedId : undefined,
  });

  useEffect(() => {
    if (!task || task.phase !== "queued") return;

    const { id: taskId, command } = task;
    const publishingStore = useFeedPublishingStore.getState();

    const publish = async () => {
      try {
        if (command.kind === "CREATE") {
          publishingStore.setPhase(taskId, "uploading");
          const request = CreateFeedRequestSchema.parse({
            image: new File(command.image.uri),
            description: command.description,
            tags: command.tags,
          });
          const job = await createFeedMutation.mutateAsync(request);

          useFeedProcessingStore.getState().start(job);
          deleteStagedUploadFile(command.image);
          useFeedPublishingStore.getState().dismiss(taskId);
          return;
        }

        publishingStore.setPhase(taskId, "updating");
        const request = UpdateFeedRequestSchema.parse({
          description: command.description,
          tags: command.tags,
        });
        await updateFeedMutation.mutateAsync(request);
        useFeedPublishingStore.getState().setPhase(taskId, "completed");
      } catch (error) {
        const action = command.kind === "CREATE" ? "게시" : "수정";
        const message = getApiErrorMessage(
          error,
          `피드를 ${action}하지 못했습니다. 잠시 후 다시 시도해주세요.`,
        );
        useFeedPublishingStore.getState().fail(taskId, message);
      }
    };

    void publish();
  }, [createFeedMutation, task, updateFeedMutation]);

  return null;
}
