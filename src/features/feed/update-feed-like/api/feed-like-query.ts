import {
  optimisticallyUpdateFeedAcrossCollections,
  rollbackFeedUpdates,
  updateFeedLists,
  userFeedQueryKeys,
} from "@entities/feed";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useUpdateFeedLike(nextIsLiked: boolean) {
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
      rollbackFeedUpdates(
        queryClient,
        context?.previousFeedCaches,
        (currentFeed, previousFeed) => ({
          ...currentFeed,
          isLiked: previousFeed.isLiked,
          likeCount: previousFeed.likeCount,
        }),
      );
    },
    onSuccess: (_, feedId) => {
      if (nextIsLiked) return;

      updateFeedLists(
        queryClient,
        userFeedQueryKeys.likedFeedLists(),
        (items) => items.filter((feed) => feed.id !== feedId),
      );
    },
  });
}

export function useLikeFeed() {
  return useUpdateFeedLike(true);
}

export function useUnlikeFeed() {
  return useUpdateFeedLike(false);
}
