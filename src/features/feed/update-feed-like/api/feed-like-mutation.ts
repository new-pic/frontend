import {
  optimisticallyUpdateFeedAcrossCollections,
  rollbackFeedCaches,
} from "@entities/feed";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useFeedLikeMutation(nextIsLiked: boolean) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      if (useAuthStore.getState().isGuest) {
        throw new Error("Member account is required.");
      }
      const request = nextIsLiked
        ? privateApiClient.post(`/feed/${feedId}/like`)
        : privateApiClient.delete(`/feed/${feedId}/like`);
      return (await request).data;
    },
    onMutate: async (feedId: string) => {
      const previousFeedCaches =
        await optimisticallyUpdateFeedAcrossCollections(
          queryClient,
          feedId,
          (feed) => ({
            ...feed,
            isLiked: nextIsLiked,
            likeCount: Math.max(0, feed.likeCount + (nextIsLiked ? 1 : -1)),
          }),
        );
      return { previousFeedCaches };
    },
    onError: (_, __, context) => {
      rollbackFeedCaches(queryClient, context?.previousFeedCaches);
    },
  });
}

export function useLikeFeed() {
  return useFeedLikeMutation(true);
}

export function useUnlikeFeed() {
  return useFeedLikeMutation(false);
}
