import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import {
  type FeedListResponse,
  type UserFeedListParams,
  userFeedQueryKeys,
} from "../model";

export function myFeedsInfiniteQueryOptions(
  userId: string | null,
  params: UserFeedListParams,
) {
  return infiniteQueryOptions({
    queryKey: userFeedQueryKeys.myFeedList(userId, params),
    queryFn: async ({ pageParam, signal }): Promise<FeedListResponse> => {
      if (!userId || useAuthStore.getState().isGuest) {
        throw new Error("Cannot fetch member feeds without a user session");
      }
      const response = await privateApiClient.get("/users/me/feeds", {
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

export function useReadMyFeeds(params: UserFeedListParams) {
  const isGuest = useAuthStore((state) => state.isGuest);
  const userId = useAuthStore((state) => state.userId);

  return useInfiniteQuery({
    ...myFeedsInfiniteQueryOptions(userId, params),
    enabled: Boolean(userId) && !isGuest,
  });
}

export function likedFeedsInfiniteQueryOptions(
  userId: string | null,
  params: UserFeedListParams,
) {
  return infiniteQueryOptions({
    queryKey: userFeedQueryKeys.likedFeedList(userId, params),
    queryFn: async ({ pageParam, signal }): Promise<FeedListResponse> => {
      if (!userId || useAuthStore.getState().isGuest) {
        throw new Error("Cannot fetch liked feeds without a user session");
      }
      const response = await privateApiClient.get("/users/me/liked-feeds", {
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

export function useReadLikedFeeds(params: UserFeedListParams) {
  const isGuest = useAuthStore((state) => state.isGuest);
  const userId = useAuthStore((state) => state.userId);

  return useInfiniteQuery({
    ...likedFeedsInfiniteQueryOptions(userId, params),
    enabled: Boolean(userId) && !isGuest,
  });
}

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
    queryKey: userFeedQueryKeys.savedFeedList(userId, params),
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
