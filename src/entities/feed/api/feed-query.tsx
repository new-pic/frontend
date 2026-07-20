import { apiClient, privateApiClient, uploadFetchClient } from "@shared/api";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  API_QUERY_KEY,
  CommentListParams,
  CommentListResponse,
  CreateFeedCommentRequest,
  FeedCommentResponse,
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
  return useInfiniteQuery({
    queryKey: [...QUERY_KEY, "list", params],
    queryFn: async ({ pageParam }): Promise<FeedListResponse> => {
      const response = await apiClient.get("/feed", {
        params: {
          ...params,
          cursor: pageParam,
        },
      });
      return response.data;
    },
    initialPageParam: params.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
      const response = await privateApiClient.get(`/feed/${feedId}`);
      return response.data;
    },
    enabled: !!feedId, // feedId가 존재할 때만 쿼리 실행
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 댓글 목록 조회
export function useReadFeedComments(
  params: CommentListParams,
  options?: { enabled?: boolean },
) {
  const { feedId, ...queryParams } = params;

  return useInfiniteQuery({
    queryKey: [...QUERY_KEY, "comments", feedId, queryParams],
    queryFn: async ({ pageParam }): Promise<CommentListResponse> => {
      const response = await apiClient.get(`/feed/${feedId}/comments`, {
        params: {
          ...queryParams,
          cursor: pageParam,
        },
      });
      return response.data;
    },
    initialPageParam: params.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!feedId && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 댓글 작성
export function useCreateFeedComment({ feedId }: { feedId: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateFeedCommentRequest,
    ): Promise<FeedCommentResponse> => {
      const response = await privateApiClient.post(
        `/feed/${feedId}/comments`,
        data,
      );
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEY, "comments", feedId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEY, "item", feedId],
        }),
      ]);
    },
  });
}

// 해시태그 목록 조회
export function useReadTags({ keyword }: { keyword?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, "tags", keyword],
    queryFn: async (): Promise<FeedTagResponse> => {
      const response = await apiClient.get("/feed/tags", {
        params: { keyword },
      });
      return response.data.items;
    },
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
      const response = await privateApiClient.patch(`/feed/${feedId}`, data);
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
      const response = await privateApiClient.post(`/feed/${feedId}/pick`);
      return response.data;
    },
    onMutate: async (feedId: string) => {
      const feedItemKey = [...QUERY_KEY, "item", feedId];

      await queryClient.cancelQueries({ queryKey: feedItemKey });

      const previousFeed =
        queryClient.getQueryData<FeedItemResponse>(feedItemKey);

      queryClient.setQueryData<FeedItemResponse>(feedItemKey, (old) => {
        if (!old) return old;

        return {
          ...old,
          isPicked: true,
          pickCount: old.pickCount + 1,
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

/**
 * 피드 저장 취소
 */
export function useUnsaveFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await privateApiClient.delete(`/feed/${feedId}/pick`);
      return response.data;
    },
    onMutate: async (feedId: string) => {
      const feedItemKey = [...QUERY_KEY, "item", feedId];

      await queryClient.cancelQueries({ queryKey: feedItemKey });

      const previousFeed =
        queryClient.getQueryData<FeedItemResponse>(feedItemKey);

      queryClient.setQueryData<FeedItemResponse>(feedItemKey, (old) => {
        if (!old) return old;

        return {
          ...old,
          isPicked: false,
          pickCount: Math.max(0, old.pickCount - 1),
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

// 피드 좋아요
export function useLikeFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await privateApiClient.post(`/feed/${feedId}/like`);
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
      const response = await privateApiClient.delete(`/feed/${feedId}/like`);
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
