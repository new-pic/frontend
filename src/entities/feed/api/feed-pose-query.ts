import { apiClient } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import {
  FeedBackgroundRemovalResponse,
  FeedPoseResponse,
  feedQueryKeys,
} from "../model";

export interface FeedBackgroundRemovalQueryResult {
  feedId: string;
  response: FeedBackgroundRemovalResponse;
}

/**
 * 피드 촬영 비교용 pose 데이터 조회
 */
export function useReadFeedPose({ feedId }: { feedId?: string }) {
  return useQuery({
    queryKey: feedQueryKeys.pose(feedId),
    queryFn: async ({ signal }): Promise<FeedPoseResponse> => {
      const response = await apiClient.get(`/feed/${feedId}/pose`, {
        signal,
      });
      return response.data;
    },
    enabled: !!feedId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * 카메라 오버레이용 피드 배경 제거 이미지 조회
 */
export function useReadFeedBackgroundRemoval({ feedId }: { feedId?: string }) {
  return useQuery({
    queryKey: feedQueryKeys.backgroundRemoval(feedId),
    queryFn: async ({ signal }): Promise<FeedBackgroundRemovalQueryResult> => {
      if (!feedId) {
        throw new Error("feedId is required");
      }
      const response = await apiClient.get(
        `/feed/${feedId}/background-removal`,
        { signal },
      );
      return {
        feedId,
        response: response.data,
      };
    },
    enabled: !!feedId,
    staleTime: 1000 * 60 * 5,
  });
}
