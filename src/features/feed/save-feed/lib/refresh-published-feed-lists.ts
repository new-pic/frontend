import { feedQuery } from "@entities/feed";
import type { QueryClient } from "@tanstack/react-query";

interface FeedListRefreshEntry {
  generation: number;
  promise: Promise<void>;
}

interface RefreshPublishedFeedListsOptions {
  force?: boolean;
}

const refreshes = new WeakMap<QueryClient, FeedListRefreshEntry>();

function resetPublishedFeedLists(queryClient: QueryClient) {
  return Promise.all([
    queryClient.resetQueries(
      { queryKey: feedQuery.feedQueryKeys.lists },
      { cancelRefetch: true, throwOnError: true },
    ),
    queryClient.resetQueries(
      { queryKey: feedQuery.feedQueryKeys.myFeeds },
      { cancelRefetch: true, throwOnError: true },
    ),
  ]).then(() => undefined);
}

export function refreshPublishedFeedLists(
  queryClient: QueryClient,
  options: RefreshPublishedFeedListsOptions = {},
): Promise<void> {
  const currentRefresh = refreshes.get(queryClient);
  if (currentRefresh && !options.force) return currentRefresh.promise;

  const generation = (currentRefresh?.generation ?? 0) + 1;
  let entry: FeedListRefreshEntry;

  const refresh = Promise.resolve()
    .then(() => resetPublishedFeedLists(queryClient))
    .catch((error) => {
      const latestRefresh = refreshes.get(queryClient);
      if (latestRefresh && latestRefresh.generation > generation) {
        return latestRefresh.promise;
      }
      throw error;
    })
    .finally(() => {
      if (refreshes.get(queryClient) === entry) {
        refreshes.delete(queryClient);
      }
    });

  entry = { generation, promise: refresh };
  refreshes.set(queryClient, entry);
  return refresh;
}
