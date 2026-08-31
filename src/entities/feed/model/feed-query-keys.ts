import type { FeedListParams } from "./models";

export const feedQueryKeys = {
  all: ["feed"] as const,
  lists: () => [...feedQueryKeys.all, "list"] as const,
  publicList: (params: FeedListParams) =>
    [...feedQueryKeys.lists(), params] as const,
  item: (feedId?: string) => [...feedQueryKeys.all, "item", feedId] as const,
  comments: () => [...feedQueryKeys.all, "comments"] as const,
  commentsByFeed: (feedId: string) =>
    [...feedQueryKeys.comments(), feedId] as const,
} as const;
