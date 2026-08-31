import { privateApiClient } from "@shared/api";
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import {
  type FeedItemResponse,
  type FeedListParams,
  type FeedListResponse,
  feedQueryKeys,
} from "../model";

export function publicFeedsInfiniteQueryOptions(params: FeedListParams) {
  return infiniteQueryOptions({
    queryKey: feedQueryKeys.publicList(params),
    queryFn: async ({ pageParam, signal }): Promise<FeedListResponse> => {
      const response = await privateApiClient.get("/feed", {
        params: { ...params, cursor: pageParam },
        signal,
      });
      return response.data;
    },
    initialPageParam: params.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 60 * 5,
  });
}

export function useReadFeeds(params: FeedListParams) {
  return useInfiniteQuery(publicFeedsInfiniteQueryOptions(params));
}

/** 여러 Page가 공유하는 피드 상세를 조회합니다. */
export function useReadFeed({ feedId }: { feedId?: string }) {
  return useQuery({
    queryKey: feedQueryKeys.item(feedId),
    queryFn: async (): Promise<FeedItemResponse> => {
      const response = await privateApiClient.get(`/feed/${feedId}`);
      return response.data;
    },
    enabled: Boolean(feedId),
    staleTime: 1000 * 60 * 5,
  });
}
