import {
  ApiInstance,
  ApiPrivateInstance,
  uploadFetchClient,
} from "@shared/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  API_QUERY_KEY,
  FeedItemResponse,
  FeedListParams,
  FeedListResponse,
  FeedTagResponse,
  UpdateFeedRequest,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "feed"];

/**
 * 피드 목록 조회
 * @returns
 */
export function useReadFeeds(params: FeedListParams) {
  return useQuery({
    queryKey: [...QUERY_KEY, "list", params],
    queryFn: async (): Promise<FeedListResponse> => {
      const response = await ApiInstance.get("/feed", { params });
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 피드 상세 조회
 */
export function useReadFeed({ feedId }: { feedId: string }) {
  console.log("feedId 상세 조회", feedId);
  return useQuery({
    queryKey: [...QUERY_KEY, "item", feedId],
    queryFn: async (): Promise<FeedItemResponse> => {
      const response = await ApiPrivateInstance.get(`/feed/${feedId}`);
      return response.data;
    },
    enabled: !!feedId, // feedId가 존재할 때만 쿼리 실행
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 피드 작성
 */
export function useCreateFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await uploadFetchClient.post({ url: "/feed", formData });
      return response.data;
    },
    onSuccess: async () => {
      // 피드 목록 캐시 무효화
      await queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, "list"] });
    },
  });
}
/**
 * 피드 수정
 */
export function useUpdateFeed({ feedId }: { feedId?: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateFeedRequest) => {
      if (!feedId) throw new Error("feedId is required for updating feed");
      const response = await ApiPrivateInstance.patch(`/feed/${feedId}`, data);
      return response.data;
    },
    onSuccess: async () => {
      // 피드 목록 캐시 무효화
      await queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, "list"] });
    },
  });
}

/**
 * 피드 저장
 */
export function useSaveFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await ApiPrivateInstance.post(`/feed/${feedId}/pick`);
      return response.data;
    },
    onSuccess: async (_, feedId: string) => {
      // 피드 목록 캐시 무효화
      await queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, "list"] });
      await queryClient.invalidateQueries({
        queryKey: [...QUERY_KEY, "item", feedId],
      });
    },
  });
}

// 피드 좋아요
export function useLikeFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await ApiPrivateInstance.post(`/feed/${feedId}/like`);
      return response.data;
    },
    onMutate: async (feedId: string) => {
      const feedItemKey = [...QUERY_KEY, "item", feedId];

      await queryClient.cancelQueries({
        queryKey: feedItemKey,
      });

      const previousFeed =
        queryClient.getQueryData<FeedItemResponse>(feedItemKey);

      queryClient.setQueryData<FeedItemResponse>(feedItemKey, (old) => {
        if (!old) return old;

        return {
          ...old,
          isLiked: true,
          likeCount: old.likeCount + 1,
        };
      });

      return { previousFeed };
    },
    onError: (_, feedId: string, context) => {
      if (!context) return;

      queryClient.setQueryData(
        [...QUERY_KEY, "item", feedId],
        context.previousFeed,
      );
    },
    onSettled: async (_, __, feedId: string) => {
      await queryClient.invalidateQueries({
        queryKey: [...QUERY_KEY, "item", feedId],
      });
    },
  });
}

// 피드 좋아요 취소
export function useUnlikeFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await ApiPrivateInstance.delete(`/feed/${feedId}/like`);
      return response.data;
    },
    onMutate: async (feedId: string) => {
      const feedItemKey = [...QUERY_KEY, "item", feedId];

      await queryClient.cancelQueries({
        queryKey: feedItemKey,
      });

      const previousFeed =
        queryClient.getQueryData<FeedItemResponse>(feedItemKey);

      queryClient.setQueryData<FeedItemResponse>(feedItemKey, (old) => {
        if (!old) return old;

        return {
          ...old,
          isLiked: false,
          likeCount: old.likeCount - 1,
        };
      });

      return { previousFeed };
    },
    onError: (_, feedId: string, context) => {
      if (!context) return;

      queryClient.setQueryData(
        [...QUERY_KEY, "item", feedId],
        context.previousFeed,
      );
    },
    onSettled: async (_, __, feedId: string) => {
      await queryClient.invalidateQueries({
        queryKey: [...QUERY_KEY, "item", feedId],
      });
    },
  });
}

export function useReadTags() {
  return useQuery({
    queryKey: [...QUERY_KEY, "tags"],
    queryFn: async (): Promise<FeedTagResponse> => {
      const response = await ApiInstance.get("/feed/tags");
      return response.data;
    },
  });
}
