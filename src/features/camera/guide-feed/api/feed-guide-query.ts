import type {
  FeedBackgroundRemovalResponse,
  FeedPoseResponse,
} from "@entities/feed";
import { apiClient } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import { cameraGuideQueryKeys } from "../model/query-keys";

export interface FeedBackgroundRemovalQueryResult {
  feedId: string;
  response: FeedBackgroundRemovalResponse;
}

export function useReadFeedPose({ feedId }: { feedId?: string }) {
  return useQuery({
    queryKey: cameraGuideQueryKeys.pose(feedId),
    queryFn: async ({ signal }): Promise<FeedPoseResponse> => {
      const response = await apiClient.get(`/feed/${feedId}/pose`, { signal });
      return response.data;
    },
    enabled: Boolean(feedId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useReadFeedBackgroundRemoval({ feedId }: { feedId?: string }) {
  return useQuery({
    queryKey: cameraGuideQueryKeys.backgroundRemoval(feedId),
    queryFn: async ({ signal }): Promise<FeedBackgroundRemovalQueryResult> => {
      if (!feedId) throw new Error("feedId is required");
      const response = await apiClient.get(
        `/feed/${feedId}/background-removal`,
        { signal },
      );
      return { feedId, response: response.data };
    },
    enabled: Boolean(feedId),
    staleTime: 1000 * 60 * 5,
  });
}
