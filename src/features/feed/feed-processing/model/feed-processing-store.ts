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
} from "../lib/feed-ai-job-adapter";
import type {
  FeedListRefreshState,
  FeedProcessingJob,
  FeedProcessingTransportState,
} from "./types";
interface FeedProcessingStore {
  job: FeedProcessingJob | null;
  start: (dto: FeedAiJobResponseDto) => void;
  applyStatus: (
    jobId: string,
    dto: FeedAiJobStatusResponseDto,
  ) => void;
  applyProgress: (
    jobId: string,
    dto: FeedAiJobProgressEventDto,
  ) => void;
  complete: (jobId: string) => void;
  fail: (jobId: string) => void;
  setTransportState: (
    jobId: string,
    state: FeedProcessingTransportState,
  ) => void;
  setListRefreshState: (
    jobId: string,
    state: FeedListRefreshState,
  ) => void;
  dismiss: () => void;
}

function updateCurrentJob(
  current: FeedProcessingJob | null,
  jobId: string,
  update: Partial<FeedProcessingJob>,
) {
  if (!current || current.jobId !== jobId) return current;
  return { ...current, ...update };
}

export const useFeedProcessingStore = create<FeedProcessingStore>()((set) => ({
  job: null,
  start: (dto) =>
    set({
      job: {
        ...adaptCreatedFeedAiJob(dto),
        progressEstimateUpdatedAt: Date.now(),
      },
    }),
  applyStatus: (jobId, dto) =>
    set((state) => ({
      job: updateCurrentJob(
        state.job,
        jobId,
        adaptFeedAiJobStatus(dto),
      ),
    })),
  applyProgress: (jobId, dto) =>
    set((state) => ({
      job: updateCurrentJob(
        state.job,
        jobId,
        {
          ...adaptFeedAiJobProgress(dto),
          progressEstimateUpdatedAt: Date.now(),
        },
      ),
    })),
  complete: (jobId) =>
    set((state) => ({
      job: updateCurrentJob(state.job, jobId, {
        phase: "completed",
        serverProgressPercent: 100,
        transportState: "idle",
      }),
    })),
  fail: (jobId) =>
    set((state) => ({
      job: updateCurrentJob(state.job, jobId, {
        phase: "failed",
        transportState: "idle",
      }),
    })),
  setTransportState: (jobId, transportState) =>
    set((state) => ({
      job: updateCurrentJob(state.job, jobId, { transportState }),
    })),
  setListRefreshState: (jobId, listRefreshState) =>
    set((state) => ({
      job: updateCurrentJob(state.job, jobId, { listRefreshState }),
    })),
  dismiss: () => set({ job: null }),
}));
