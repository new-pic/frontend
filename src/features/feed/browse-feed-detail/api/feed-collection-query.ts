import type {
  FeedListParams,
  FeedListResponse,
  UserFeedListParams,
} from "@entities/feed";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { feedCollectionQueryKeys } from "../model/query-keys";

export function publicFeedsInfiniteQueryOptions(params: FeedListParams) {
  return infiniteQueryOptions({
    queryKey: feedCollectionQueryKeys.publicList(params),
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

export function myFeedsInfiniteQueryOptions(
  userId: string | null,
  params: UserFeedListParams,
) {
  return infiniteQueryOptions({
    queryKey: feedCollectionQueryKeys.myFeedList(userId, params),
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
    queryKey: feedCollectionQueryKeys.likedFeedList(userId, params),
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
