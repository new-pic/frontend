import type { UserFeedListParams } from "./models";

export const feedQueryKeys = {
  all: ["feed"] as const,
  lists: () => [...feedQueryKeys.all, "list"] as const,
  item: (feedId?: string) => [...feedQueryKeys.all, "item", feedId] as const,
  myFeedLists: () => [...feedQueryKeys.all, "me", "feeds"] as const,
  likedFeedLists: () => [...feedQueryKeys.all, "me", "liked-feeds"] as const,
  savedFeedLists: () => [...feedQueryKeys.all, "me", "saved-feeds"] as const,
  savedFeedList: (userId: string | null, params: UserFeedListParams) =>
    [...feedQueryKeys.savedFeedLists(), userId, params] as const,
  comments: () => [...feedQueryKeys.all, "comments"] as const,
  commentsByFeed: (feedId: string) =>
    [...feedQueryKeys.comments(), feedId] as const,
} as const;
