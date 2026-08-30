import type {
  CommentListParams,
  FeedListParams,
  UserFeedListParams,
} from "./models";

export const feedQueryKeys = {
  all: ["feed"] as const,
  lists: () => [...feedQueryKeys.all, "list"] as const,
  list: (params: FeedListParams) => [...feedQueryKeys.lists(), params] as const,
  item: (feedId?: string) => [...feedQueryKeys.all, "item", feedId] as const,
  myFeedLists: () => [...feedQueryKeys.all, "me", "feeds"] as const,
  myFeedList: (userId: string | null, params: UserFeedListParams) =>
    [...feedQueryKeys.myFeedLists(), userId, params] as const,
  likedFeedLists: () => [...feedQueryKeys.all, "me", "liked-feeds"] as const,
  likedFeedList: (userId: string | null, params: UserFeedListParams) =>
    [...feedQueryKeys.likedFeedLists(), userId, params] as const,
  savedFeedLists: () => [...feedQueryKeys.all, "me", "saved-feeds"] as const,
  savedFeedList: (userId: string | null, params: UserFeedListParams) =>
    [...feedQueryKeys.savedFeedLists(), userId, params] as const,
  comments: () => [...feedQueryKeys.all, "comments"] as const,
  commentsByFeed: (feedId: string) =>
    [...feedQueryKeys.comments(), feedId] as const,
  commentList: (feedId: string, params: Omit<CommentListParams, "feedId">) =>
    [...feedQueryKeys.commentsByFeed(feedId), params] as const,
  tags: (keyword?: string) => [...feedQueryKeys.all, "tags", keyword] as const,
  poses: () => [...feedQueryKeys.all, "pose"] as const,
  pose: (feedId?: string) => [...feedQueryKeys.poses(), feedId] as const,
  backgroundRemovals: () =>
    [...feedQueryKeys.all, "pose", "background-removal"] as const,
  backgroundRemoval: (feedId?: string) =>
    [...feedQueryKeys.backgroundRemovals(), feedId] as const,
} as const;
