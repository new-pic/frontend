import { feedQueryKeys, type CommentListParams } from "@entities/feed";

export const feedCommentQueryKeys = {
  list: (feedId: string, params: Omit<CommentListParams, "feedId">) =>
    [...feedQueryKeys.commentsByFeed(feedId), params] as const,
} as const;
