import type { UserFeedListParams } from "./models";
import { feedQueryKeys } from "./feed-query-keys";

export const userFeedQueryKeys = {
  all: [...feedQueryKeys.all, "me"] as const,
  myFeedLists: () => [...userFeedQueryKeys.all, "feeds"] as const,
  myFeedList: (userId: string | null, params: UserFeedListParams) =>
    [...userFeedQueryKeys.myFeedLists(), userId, params] as const,
  likedFeedLists: () => [...userFeedQueryKeys.all, "liked-feeds"] as const,
  likedFeedList: (userId: string | null, params: UserFeedListParams) =>
    [...userFeedQueryKeys.likedFeedLists(), userId, params] as const,
  savedFeedLists: () => [...userFeedQueryKeys.all, "saved-feeds"] as const,
  savedFeedList: (userId: string | null, params: UserFeedListParams) =>
    [...userFeedQueryKeys.savedFeedLists(), userId, params] as const,
} as const;
