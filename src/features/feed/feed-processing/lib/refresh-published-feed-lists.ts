import { feedQueryKeys } from "@entities/feed/api/feed-query";
import { userQueryKeys } from "@entities/user/api/user-query";
import type { QueryClient } from "@tanstack/react-query";

const refreshes = new WeakMap<QueryClient, Promise<void>>();

export function refreshPublishedFeedLists(
  queryClient: QueryClient,
): Promise<void> {
  const currentRefresh = refreshes.get(queryClient);
  if (currentRefresh) return currentRefresh;

  const refresh = Promise.all([
    queryClient.resetQueries(
      { queryKey: feedQueryKeys.lists },
      { cancelRefetch: false, throwOnError: true },
    ),
    queryClient.resetQueries(
      { queryKey: userQueryKeys.myFeeds },
      { cancelRefetch: false, throwOnError: true },
    ),
  ])
    .then(() => undefined)
    .finally(() => {
      if (refreshes.get(queryClient) === refresh) {
        refreshes.delete(queryClient);
      }
    });

  refreshes.set(queryClient, refresh);
  return refresh;
}
