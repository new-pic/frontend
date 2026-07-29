import {
  savedFeedsInfiniteQueryOptions,
  userQueryKeys,
} from "@entities/user/api/user-query";
import type { QueryClient } from "@tanstack/react-query";
import { SAVED_FEED_SYNC_CONFIG } from "../config/saved-feed-sync-config";

export async function refreshSavedFeedGuideCache(
  queryClient: QueryClient,
) {
  await queryClient.resetQueries(
    { queryKey: userQueryKeys.savedFeeds },
    { cancelRefetch: true },
  );
  await queryClient.fetchInfiniteQuery(
    savedFeedsInfiniteQueryOptions({
      take: SAVED_FEED_SYNC_CONFIG.firstPageTake,
    }),
  );
}
