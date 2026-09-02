import { create } from "zustand";
import type {
  FeedPublishingCommand,
  FeedPublishingPhase,
  FeedPublishingTask,
} from "./feed-publishing-types";

interface FeedPublishingStore {
  publishingTask: FeedPublishingTask | null;
  enqueue: (command: FeedPublishingCommand) => boolean;
  setPublishingPhase: (
    publishingTaskId: string,
    publishingPhase: FeedPublishingPhase,
  ) => void;
  markPublishingFailed: (
    publishingTaskId: string,
    failureMessage: string,
  ) => void;
  retryPublishing: (publishingTaskId: string) => void;
  dismissPublishing: (publishingTaskId: string) => void;
}

let taskSequence = 0;

function createTaskId() {
  taskSequence += 1;
  return `feed-publishing-${Date.now()}-${taskSequence}`;
}

function updateCurrentTask(
  publishingTask: FeedPublishingTask | null,
  publishingTaskId: string,
  update: Partial<FeedPublishingTask>,
) {
  if (!publishingTask || publishingTask.publishingTaskId !== publishingTaskId) {
    return publishingTask;
  }
  return { ...publishingTask, ...update };
}

export const useFeedPublishingStore = create<FeedPublishingStore>()(
  (set, get) => ({
    publishingTask: null,
    enqueue: (command) => {
      const currentTask = get().publishingTask;
      if (currentTask && currentTask.publishingPhase !== "completed") {
        return false;
      }

      set({
        publishingTask: {
          publishingTaskId: createTaskId(),
          command,
          publishingPhase: "queued",
        },
      });
      return true;
    },
    setPublishingPhase: (publishingTaskId, publishingPhase) =>
      set((state) => ({
        publishingTask: updateCurrentTask(
          state.publishingTask,
          publishingTaskId,
          {
            publishingPhase,
            failureMessage: undefined,
          },
        ),
      })),
    markPublishingFailed: (publishingTaskId, failureMessage) =>
      set((state) => ({
        publishingTask: updateCurrentTask(
          state.publishingTask,
          publishingTaskId,
          {
            publishingPhase: "failed",
            failureMessage,
          },
        ),
      })),
    retryPublishing: (publishingTaskId) =>
      set((state) => ({
        publishingTask:
          state.publishingTask?.publishingTaskId === publishingTaskId &&
          state.publishingTask.publishingPhase === "failed"
            ? {
                ...state.publishingTask,
                publishingPhase: "queued",
                failureMessage: undefined,
              }
            : state.publishingTask,
      })),
    dismissPublishing: (publishingTaskId) =>
      set((state) => ({
        publishingTask:
          state.publishingTask?.publishingTaskId === publishingTaskId
            ? null
            : state.publishingTask,
      })),
  }),
);
