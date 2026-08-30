import type { CommentListParams, CommentListResponse } from "@entities/feed";
import { privateApiClient } from "@shared/api";
import { useInfiniteQuery } from "@tanstack/react-query";
import { feedCommentQueryKeys } from "../model/query-keys";

export function useReadFeedComments(
  params: CommentListParams,
  options?: { enabled?: boolean },
) {
  const { feedId, ...queryParams } = params;

  return useInfiniteQuery({
    queryKey: feedCommentQueryKeys.list(feedId, queryParams),
    queryFn: async ({ pageParam }): Promise<CommentListResponse> => {
      const response = await privateApiClient.get(`/feed/${feedId}/comments`, {
        params: { ...queryParams, cursor: pageParam },
      });
      return response.data;
    },
    initialPageParam: params.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(feedId) && options?.enabled !== false,
    staleTime: 1000 * 60 * 5,
  });
}
