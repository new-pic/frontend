import { ApiInstance, ApiPrivateInstance } from "@shared/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  API_QUERY_KEY,
  FeedItemResponse,
  FeedListParams,
  FeedListResponse,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "feed"];

/**
 * 피드 목록 조회
 * @returns
 */
export function useReadFeeds(params: FeedListParams) {
  return useQuery({
    queryKey: [...QUERY_KEY, "list"],
    queryFn: async (): Promise<FeedListResponse> => {
      const response = await ApiInstance.get("/feed", { params });
      return response.data;
    },
  });
}

/**
 * 피드 상세 조회
 */
export function useReadFeed(feedId: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, "item", feedId],
    queryFn: async (): Promise<FeedItemResponse> => {
      const response = await ApiInstance.get(`/feed/${feedId}`);
      return response.data;
    },
  });
}

/**
 * 피드 작성
 */
export function useCreateFeed() {
  return useMutation({
    mutationKey: [...QUERY_KEY, "create"],
    mutationFn: async (data) => {
      const response = await ApiPrivateInstance.post("/feed", data);
      return response.data;
    },
  });
}

/**
 * 피드 저장
 */
export function useSaveFeed() {
  return useMutation({
    mutationKey: [...QUERY_KEY, "save"],
    mutationFn: async (feedId: string) => {
      const response = await ApiPrivateInstance.post(`/feed/${feedId}/pick`);
      return response.data;
    },
  });
}
