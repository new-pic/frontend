import {
  feedQuery,
  type FeedListParams,
  type FeedListResponse,
  userFeedQuery,
} from "@entities/feed";
import {
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useAuthStore } from "@shared/model";
import type { FeedDetailSource } from "./feed-detail-navigation";

interface UseFeedDetailCollectionParams {
  source: FeedDetailSource;
  params: FeedListParams;
  enabled?: boolean;
}

type FeedDetailCollectionQueryOptions = UseInfiniteQueryOptions<
  FeedListResponse,
  Error,
  InfiniteData<FeedListResponse, string | undefined>,
  QueryKey,
  string | undefined
>;

function getFeedDetailCollectionQueryOptions(
  source: FeedDetailSource,
  userId: string | null,
  params: FeedListParams,
): FeedDetailCollectionQueryOptions {
  const paginationParams =
    params.cursor === undefined
      ? { take: params.take }
      : { take: params.take, cursor: params.cursor };

  switch (source) {
    case "mine":
      return userFeedQuery.myFeedsInfiniteQueryOptions(
        userId,
        paginationParams,
      ) as unknown as FeedDetailCollectionQueryOptions;
    case "saved":
      return userFeedQuery.savedFeedsInfiniteQueryOptions(
        userId,
        paginationParams,
      ) as unknown as FeedDetailCollectionQueryOptions;
    case "liked":
      return userFeedQuery.likedFeedsInfiniteQueryOptions(
        userId,
        paginationParams,
      ) as unknown as FeedDetailCollectionQueryOptions;
    case "public":
      return feedQuery.publicFeedsInfiniteQueryOptions(
        params,
      ) as unknown as FeedDetailCollectionQueryOptions;
  }
}

export function useFeedDetailCollection({
  source,
  params,
  enabled = true,
}: UseFeedDetailCollectionParams) {
  const userId = useAuthStore((state) => state.userId);
  const isGuest = useAuthStore((state) => state.isGuest);

  return useInfiniteQuery({
    ...getFeedDetailCollectionQueryOptions(source, userId, params),
    enabled: enabled && (source === "public" || (Boolean(userId) && !isGuest)),
  });
}
