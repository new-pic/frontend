import {
  feedQueryKeys,
  optimisticallyUpdateFeedLists,
  type CreateFeedRequest,
  type FeedAiJobResponseDto,
  type FeedResponse,
  type UpdateFeedRequest,
} from "@entities/feed";
import { privateApiClient, uploadFetchClient } from "@shared/api";
import { ObjectToFormData } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateFeed() {
  return useMutation({
    mutationFn: async (
      request: CreateFeedRequest,
    ): Promise<FeedAiJobResponseDto> => {
      if (useAuthStore.getState().isGuest) {
        throw new Error("Member account is required.");
      }
      const formData = ObjectToFormData(request);
      const response = await uploadFetchClient.post({ url: "/feed", formData });
      return response.data;
    },
  });
}

export function useUpdateFeed({ feedId }: { feedId?: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateFeedRequest) => {
      if (useAuthStore.getState().isGuest) {
        throw new Error("Member account is required.");
      }
      if (!feedId) throw new Error("feedId is required for updating feed");
      const response = await privateApiClient.patch(`/feed/${feedId}`, data);
      return response.data;
    },
    onSuccess: async (data: FeedResponse) => {
      await optimisticallyUpdateFeedLists(
        queryClient,
        feedQueryKeys.lists(),
        (items) =>
          items.map((feed) =>
            feed.id === data.id ? { ...feed, ...data } : feed,
          ),
      );
      queryClient.setQueryData(feedQueryKeys.item(feedId), data);
    },
  });
}
