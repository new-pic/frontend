import {
  feedQueryKeys,
  type FeedListParams,
  type UserFeedListParams,
} from "@entities/feed";

export const feedCollectionQueryKeys = {
  publicList: (params: FeedListParams) =>
    [...feedQueryKeys.lists(), params] as const,
  myFeedList: (userId: string | null, params: UserFeedListParams) =>
    [...feedQueryKeys.myFeedLists(), userId, params] as const,
  likedFeedList: (userId: string | null, params: UserFeedListParams) =>
    [...feedQueryKeys.likedFeedLists(), userId, params] as const,
} as const;
