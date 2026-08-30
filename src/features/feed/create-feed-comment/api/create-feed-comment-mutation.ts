import {
  feedQueryKeys,
  type CreateFeedCommentRequest,
  type FeedCommentResponse,
} from "@entities/feed";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateFeedComment({ feedId }: { feedId: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateFeedCommentRequest,
    ): Promise<FeedCommentResponse> => {
      if (useAuthStore.getState().isGuest) {
        throw new Error("Member account is required.");
      }
      const response = await privateApiClient.post(
        `/feed/${feedId}/comments`,
        data,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: feedQueryKeys.commentsByFeed(feedId),
      });
    },
  });
}
