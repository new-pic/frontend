import type {
  FeedAiJobProgressEventDto,
  FeedAiJobResponseDto,
  FeedAiJobStatusResponseDto,
} from "@entities/feed";
import { create } from "zustand";
import {
  adaptCreatedFeedAiJob,
  adaptFeedAiJobProgress,
  adaptFeedAiJobStatus,
} from "./feed-ai-job-adapter";
import type {
  FeedAiProcessingLifecycle,
  FeedListSyncState,
  FeedProcessingMonitoringState,
} from "./feed-processing-types";

interface FeedProcessingStore {
  processingLifecycle: FeedAiProcessingLifecycle | null;
  startProcessing: (dto: FeedAiJobResponseDto) => void;
  applyStatusSnapshot: (jobId: string, dto: FeedAiJobStatusResponseDto) => void;
  applyProgressEvent: (jobId: string, dto: FeedAiJobProgressEventDto) => void;
  markProcessingCompleted: (jobId: string) => void;
  markProcessingFailed: (jobId: string) => void;
  setMonitoringState: (
    jobId: string,
    state: FeedProcessingMonitoringState,
  ) => void;
  setFeedListSyncState: (jobId: string, state: FeedListSyncState) => void;
  dismissProcessing: () => void;
}

function updateCurrentLifecycle(
  current: FeedAiProcessingLifecycle | null,
  jobId: string,
  update: Partial<FeedAiProcessingLifecycle>,
) {
  if (!current || current.jobId !== jobId) return current;
  return { ...current, ...update };
}

export const useFeedProcessingStore = create<FeedProcessingStore>()((set) => ({
  processingLifecycle: null,
  startProcessing: (dto) =>
    set({
      processingLifecycle: {
        ...adaptCreatedFeedAiJob(dto),
        progressSnapshotReceivedAtMs: Date.now(),
      },
    }),
  applyStatusSnapshot: (jobId, dto) =>
    set((state) => ({
      processingLifecycle: updateCurrentLifecycle(
        state.processingLifecycle,
        jobId,
        adaptFeedAiJobStatus(dto),
      ),
    })),
  applyProgressEvent: (jobId, dto) =>
    set((state) => ({
      processingLifecycle: updateCurrentLifecycle(
        state.processingLifecycle,
        jobId,
        {
          ...adaptFeedAiJobProgress(dto),
          progressSnapshotReceivedAtMs: Date.now(),
        },
      ),
    })),
  markProcessingCompleted: (jobId) =>
    set((state) => ({
      processingLifecycle: updateCurrentLifecycle(
        state.processingLifecycle,
        jobId,
        {
          processingPhase: "completed",
          serverProgressPercent: 100,
          monitoringState: "idle",
        },
      ),
    })),
  markProcessingFailed: (jobId) =>
    set((state) => ({
      processingLifecycle: updateCurrentLifecycle(
        state.processingLifecycle,
        jobId,
        {
          processingPhase: "failed",
          monitoringState: "idle",
        },
      ),
    })),
  setMonitoringState: (jobId, monitoringState) =>
    set((state) => ({
      processingLifecycle: updateCurrentLifecycle(
        state.processingLifecycle,
        jobId,
        { monitoringState },
      ),
    })),
  setFeedListSyncState: (jobId, feedListSyncState) =>
    set((state) => ({
      processingLifecycle: updateCurrentLifecycle(
        state.processingLifecycle,
        jobId,
        { feedListSyncState },
      ),
    })),
  dismissProcessing: () => set({ processingLifecycle: null }),
}));
