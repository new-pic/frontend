import {
  feedQueryKeys,
  optimisticallyUpdateFeedLists,
  rollbackFeedLists,
} from "@entities/feed";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteFeedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      if (useAuthStore.getState().isGuest) {
        throw new Error("Member account is required.");
      }
      const response = await privateApiClient.delete(`/feed/${feedId}`);
      return response.data;
    },
    onMutate: async (feedId: string) => {
      const previousFeedLists = await optimisticallyUpdateFeedLists(
        queryClient,
        feedQueryKeys.lists(),
        (items) => items.filter((feed) => feed.id !== feedId),
      );
      return { previousFeedLists };
    },
    onError: (_, __, context) => {
      rollbackFeedLists(queryClient, context?.previousFeedLists);
    },
    onSuccess: (_, feedId) => {
      queryClient.removeQueries({ queryKey: feedQueryKeys.item(feedId) });
      queryClient.removeQueries({
        queryKey: feedQueryKeys.commentsByFeed(feedId),
      });
    },
  });
}
