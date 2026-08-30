import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import {
  type FeedItemResponse,
  type FeedListResponse,
  feedQueryKeys,
  type UserFeedListParams,
} from "../model";

/** 여러 Slice가 공유하는 저장 피드 컬렉션을 조회합니다. */
export function useReadSavedFeeds(
  params: UserFeedListParams,
  options?: { enabled?: boolean },
) {
  const isGuest = useAuthStore((state) => state.isGuest);
  const userId = useAuthStore((state) => state.userId);

  return useInfiniteQuery({
    ...savedFeedsInfiniteQueryOptions(userId, params),
    enabled: Boolean(userId) && !isGuest && (options?.enabled ?? true),
  });
}

export function savedFeedsInfiniteQueryOptions(
  userId: string | null,
  params: UserFeedListParams,
) {
  return infiniteQueryOptions({
    queryKey: feedQueryKeys.savedFeedList(userId, params),
    queryFn: async ({ pageParam, signal }): Promise<FeedListResponse> => {
      if (!userId || useAuthStore.getState().isGuest) {
        throw new Error("Cannot fetch saved feeds without a user session");
      }
      const response = await privateApiClient.get("/users/me/references", {
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
