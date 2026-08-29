import { apiClient } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import {
  API_QUERY_KEY,
  FeedBackgroundRemovalResponse,
  FeedPoseResponse,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "pose"] as const;
const BACKGROUND_REMOVAL_QUERY_KEY = [
  ...QUERY_KEY,
  "background-removal",
] as const;

export interface FeedBackgroundRemovalQueryResult {
  feedId: string;
  response: FeedBackgroundRemovalResponse;
}

/**
 * 피드 촬영 비교용 pose 데이터 조회
 */
export function useReadFeedPose({ feedId }: { feedId?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, feedId],
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
    queryKey: [...BACKGROUND_REMOVAL_QUERY_KEY, feedId],
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
