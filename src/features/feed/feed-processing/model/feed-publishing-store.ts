import { create } from "zustand";
import type {
  FeedPublishingCommand,
  FeedPublishingPhase,
  FeedPublishingTask,
} from "./feed-publishing-types";

interface FeedPublishingStore {
  task: FeedPublishingTask | null;
  enqueue: (command: FeedPublishingCommand) => boolean;
  setPhase: (taskId: string, phase: FeedPublishingPhase) => void;
  fail: (taskId: string, errorMessage: string) => void;
  retry: (taskId: string) => void;
  dismiss: (taskId: string) => void;
}

let taskSequence = 0;

function createTaskId() {
  taskSequence += 1;
  return `feed-publishing-${Date.now()}-${taskSequence}`;
}

function updateCurrentTask(
  task: FeedPublishingTask | null,
  taskId: string,
  update: Partial<FeedPublishingTask>,
) {
  if (!task || task.id !== taskId) return task;
  return { ...task, ...update };
}

export const useFeedPublishingStore = create<FeedPublishingStore>()(
  (set, get) => ({
    task: null,
    enqueue: (command) => {
      const currentTask = get().task;
      if (currentTask && currentTask.phase !== "completed") return false;

      set({
        task: {
          id: createTaskId(),
          command,
          phase: "queued",
        },
      });
      return true;
    },
    setPhase: (taskId, phase) =>
      set((state) => ({
        task: updateCurrentTask(state.task, taskId, {
          phase,
          errorMessage: undefined,
        }),
      })),
    fail: (taskId, errorMessage) =>
      set((state) => ({
        task: updateCurrentTask(state.task, taskId, {
          phase: "failed",
          errorMessage,
        }),
      })),
    retry: (taskId) =>
      set((state) => ({
        task:
          state.task?.id === taskId && state.task.phase === "failed"
            ? { ...state.task, phase: "queued", errorMessage: undefined }
            : state.task,
      })),
    dismiss: (taskId) =>
      set((state) => ({
        task: state.task?.id === taskId ? null : state.task,
      })),
  }),
);
