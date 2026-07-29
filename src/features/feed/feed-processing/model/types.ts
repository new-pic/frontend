export type FeedProcessingPhase =
  | "processing"
  | "completed"
  | "failed";

export type FeedProcessingTransportState =
  | "idle"
  | "connecting"
  | "streaming"
  | "polling"
  | "disconnected";

export type FeedListRefreshState =
  | "idle"
  | "pending"
  | "succeeded"
  | "failed";

export interface FeedProcessingJob {
  jobId: string;
  feedId: string;
  phase: FeedProcessingPhase;
  progressPercent: number;
  estimatedRemainingSeconds?: number;
  transportState: FeedProcessingTransportState;
  listRefreshState: FeedListRefreshState;
}
