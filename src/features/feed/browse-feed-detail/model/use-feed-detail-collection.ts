import {
  feedQuery,
  type FeedListParams,
  type FeedListResponse,
} from "@entities/feed";
import { usersQuery } from "@entities/user";
import {
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query";
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
  params: FeedListParams,
): FeedDetailCollectionQueryOptions {
  const paginationParams =
    params.cursor === undefined
      ? { take: params.take }
      : { take: params.take, cursor: params.cursor };

  switch (source) {
    case "mine":
      return usersQuery.myFeedsInfiniteQueryOptions(
        paginationParams,
      ) as unknown as FeedDetailCollectionQueryOptions;
    case "saved":
      return usersQuery.savedFeedsInfiniteQueryOptions(
        paginationParams,
      ) as unknown as FeedDetailCollectionQueryOptions;
    case "liked":
      return usersQuery.likedFeedsInfiniteQueryOptions(
        paginationParams,
      ) as unknown as FeedDetailCollectionQueryOptions;
    case "public":
      return feedQuery.feedsInfiniteQueryOptions(
        params,
      ) as unknown as FeedDetailCollectionQueryOptions;
  }
}

export function useFeedDetailCollection({
  source,
  params,
  enabled = true,
}: UseFeedDetailCollectionParams) {
  return useInfiniteQuery({
    ...getFeedDetailCollectionQueryOptions(source, params),
    enabled,
  });
}
