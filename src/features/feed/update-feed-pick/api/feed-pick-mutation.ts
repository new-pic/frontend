import {
  optimisticallyUpdateFeedAcrossCollections,
  rollbackFeedCaches,
} from "@entities/feed";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useFeedPickMutation(nextIsPicked: boolean) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      if (useAuthStore.getState().isGuest) {
        throw new Error("Member account is required.");
      }
      const request = nextIsPicked
        ? privateApiClient.post(`/feed/${feedId}/pick`)
        : privateApiClient.delete(`/feed/${feedId}/pick`);
      return (await request).data;
    },
    onMutate: async (feedId: string) => {
      const previousFeedCaches =
        await optimisticallyUpdateFeedAcrossCollections(
          queryClient,
          feedId,
          (feed) => ({
            ...feed,
            isPicked: nextIsPicked,
            pickCount: Math.max(0, feed.pickCount + (nextIsPicked ? 1 : -1)),
          }),
        );
      return { previousFeedCaches };
    },
    onError: (_, __, context) => {
      rollbackFeedCaches(queryClient, context?.previousFeedCaches);
    },
  });
}

export function useSaveFeed() {
  return useFeedPickMutation(true);
}

export function useUnsaveFeed() {
  return useFeedPickMutation(false);
}
