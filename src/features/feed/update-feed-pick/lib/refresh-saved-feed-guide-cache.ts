import { feedQuery } from "@entities/feed";
import type { QueryClient } from "@tanstack/react-query";
import { SAVED_FEED_SYNC_CONFIG } from "../config/saved-feed-sync-config";

export async function refreshSavedFeedGuideCache(
  queryClient: QueryClient,
  userId: string | null,
) {
  await queryClient.resetQueries(
    { queryKey: feedQuery.feedQueryKeys.savedFeeds },
    { cancelRefetch: true },
  );

  if (!userId) return;

  await queryClient.fetchInfiniteQuery(
    feedQuery.savedFeedsInfiniteQueryOptions(userId, {
      take: SAVED_FEED_SYNC_CONFIG.firstPageTake,
    }),
  );
}
