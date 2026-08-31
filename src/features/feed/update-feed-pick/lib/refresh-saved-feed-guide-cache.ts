import { userFeedQuery, userFeedQueryKeys } from "@entities/feed";
import type { QueryClient } from "@tanstack/react-query";
import { SAVED_FEED_SYNC_CONFIG } from "../config/saved-feed-sync-config";

export async function refreshSavedFeedGuideCache(
  queryClient: QueryClient,
  userId: string | null,
) {
  await queryClient.resetQueries(
    { queryKey: userFeedQueryKeys.savedFeedLists() },
    { cancelRefetch: true },
  );

  if (!userId) return;

  await queryClient.fetchInfiniteQuery(
    userFeedQuery.savedFeedsInfiniteQueryOptions(userId, {
      take: SAVED_FEED_SYNC_CONFIG.firstPageTake,
    }),
  );
}
