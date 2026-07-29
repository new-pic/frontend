import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { refreshSavedFeedGuideCache } from "../lib/refresh-saved-feed-guide-cache";

export function useRefreshSavedFeedGuideCache() {
  const queryClient = useQueryClient();

  return useCallback(
    () => refreshSavedFeedGuideCache(queryClient),
    [queryClient],
  );
}
