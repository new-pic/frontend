import { useAuthStore } from "@shared/model";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { refreshSavedFeedGuideCache } from "../lib/refresh-saved-feed-guide-cache";

export function useRefreshSavedFeedGuideCache() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  return useCallback(
    () => refreshSavedFeedGuideCache(queryClient, userId),
    [queryClient, userId],
  );
}
