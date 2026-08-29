import {
  feedQuery,
  isFeedAuthoredBy,
  removeCommentsByAuthorFromCacheData,
  removeFeedsByAuthorFromCacheData,
} from "@entities/feed";
import { type BlockedUserListResponse, userBlockQuery } from "@entities/user";
import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

interface CacheEntry {
  queryKey: QueryKey;
}

function removeBlockedUserContent(data: unknown, userId: string) {
  return removeCommentsByAuthorFromCacheData(
    removeFeedsByAuthorFromCacheData(data, userId),
    userId,
  );
}

export async function hideBlockedUserContent(
  queryClient: QueryClient,
  userId: string,
) {
  const cachedQueries = queryClient.getQueryCache().findAll();
  const entriesToUpdate: CacheEntry[] = [];
  const entriesToRemove: CacheEntry[] = [];

  cachedQueries.forEach((query) => {
    const data = query.state.data;
    if (isFeedAuthoredBy(data, userId)) {
      entriesToRemove.push({ queryKey: query.queryKey });
      return;
    }

    if (removeBlockedUserContent(data, userId) !== data) {
      entriesToUpdate.push({ queryKey: query.queryKey });
    }
  });

  await Promise.allSettled(
    [...entriesToUpdate, ...entriesToRemove].map(({ queryKey }) =>
      queryClient.cancelQueries({ queryKey, exact: true }),
    ),
  );

  entriesToUpdate.forEach(({ queryKey }) => {
    queryClient.setQueryData(queryKey, (data: unknown) =>
      removeBlockedUserContent(data, userId),
    );
  });
  entriesToRemove.forEach(({ queryKey }) => {
    queryClient.removeQueries({ queryKey, exact: true });
  });
}

export function removeUnblockedUserFromListCache(
  queryClient: QueryClient,
  userId: string,
) {
  queryClient.setQueriesData<
    InfiniteData<BlockedUserListResponse, string | undefined>
  >({ queryKey: userBlockQuery.userBlockQueryKeys.all }, (data) => {
    if (!data) return data;

    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.filter(
          ({ blockedUser }) => blockedUser.id !== userId,
        ),
      })),
    };
  });
}

export async function refreshUserContentQueries(queryClient: QueryClient) {
  await Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: feedQuery.feedQueryKeys.all,
    }),
    queryClient.invalidateQueries({
      queryKey: feedQuery.feedQueryKeys.myFeeds,
    }),
    queryClient.invalidateQueries({
      queryKey: feedQuery.feedQueryKeys.likedFeeds,
    }),
    queryClient.invalidateQueries({
      queryKey: feedQuery.feedQueryKeys.savedFeeds,
    }),
  ]);
}
