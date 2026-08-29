import type { StagedUploadFile } from "@shared/lib";

export interface CreateFeedPublishingCommand {
  kind: "CREATE";
  image: StagedUploadFile;
  description: string;
  tags: string[];
}

export interface UpdateFeedPublishingCommand {
  kind: "UPDATE";
  feedId: string;
  description: string;
  tags: string[];
}

export type FeedPublishingCommand =
  CreateFeedPublishingCommand | UpdateFeedPublishingCommand;

export type FeedPublishingPhase =
  "queued" | "uploading" | "updating" | "completed" | "failed";

export interface FeedPublishingTask {
  id: string;
  command: FeedPublishingCommand;
  phase: FeedPublishingPhase;
  errorMessage?: string;
}
