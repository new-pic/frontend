import { feedQuery } from "@entities/feed";
import type { QueryClient } from "@tanstack/react-query";
import { SAVED_FEED_SYNC_CONFIG } from "../config/saved-feed-sync-config";

export async function refreshSavedFeedGuideCache(
  queryClient: QueryClient,
) {
  await queryClient.resetQueries(
    { queryKey: feedQuery.feedQueryKeys.savedFeeds },
    { cancelRefetch: true },
  );
  await queryClient.fetchInfiniteQuery(
    feedQuery.savedFeedsInfiniteQueryOptions({
      take: SAVED_FEED_SYNC_CONFIG.firstPageTake,
    }),
  );
}
