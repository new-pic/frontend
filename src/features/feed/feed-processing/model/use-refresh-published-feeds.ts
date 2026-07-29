import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshPublishedFeedLists } from "../lib/refresh-published-feed-lists";

export function useRefreshPublishedFeeds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => refreshPublishedFeedLists(queryClient),
  });
}
