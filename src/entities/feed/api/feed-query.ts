import { apiClient, privateApiClient, uploadFetchClient } from "@shared/api";
import { ObjectToFormData } from "@shared/lib";
import {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
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
  CreateFeedRequest,
  FeedAiJobResponseDto,
  FeedCommentResponse,
  FeedItemResponse,
  FeedListParams,
  FeedListResponse,
  FeedResponse,
  FeedTagResponse,
  UpdateFeedRequest,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "feed"] as const;

// 피드 목록 쿼리 키
const FEED_LIST_QUERY_KEY = [...QUERY_KEY, "list"] as const;

export const feedQueryKeys = {
  all: QUERY_KEY,
  lists: FEED_LIST_QUERY_KEY,
  list: (params: FeedListParams) => [...FEED_LIST_QUERY_KEY, params] as const,
  item: (feedId?: string) => [...QUERY_KEY, "item", feedId] as const,
} as const;

// useInfiniteQuery의 반환 data 타입
type FeedListInfiniteData = InfiniteData<
  FeedListResponse,
  FeedListParams["cursor"]
>;

/**
 * 피드 목록 캐시들의 복원용 스냅샷(백업) 데이터 타입
 *
 * `getQueriesData`의 반환 타입으로, 다양한 검색 조건(파라미터/카테고리)별
 * `[QueryKey, 캐시 데이터]` 튜플들의 배열 형태입니다.
 * 낙관적 업데이트 실패 시 원래 상태로 롤백(Rollback)하는 데 사용됩니다.
 */
type FeedListCacheSnapshot = Array<
  [QueryKey, FeedListInfiniteData | undefined]
>;

/**
 * @description 피드 목록 낙관적 업데이트 함수
 * @param queryClient
 * @param updateItems 피드 목록 내 항목(items)들을 변환/수정하는 콜백 함수
 * @returns 변환/수정 전 피드 목록
 */
async function optimisticallyUpdateFeedLists(
  queryClient: QueryClient,
  updateItems: (items: FeedResponse[]) => FeedResponse[],
) {
  await queryClient.cancelQueries({ queryKey: FEED_LIST_QUERY_KEY });

  // 쿼리키에 매핑되는 모든 수정 전 캐시 데이터
  const previousFeedLists = queryClient.getQueriesData<FeedListInfiniteData>({
    queryKey: FEED_LIST_QUERY_KEY,
  });

  // 쿼리키에 매핑되는 모든 캐시 데이터를 각각 수정
  queryClient.setQueriesData<FeedListInfiniteData>(
    { queryKey: FEED_LIST_QUERY_KEY },
    (old) => {
      if (!old) return old;

      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: updateItems(page.items),
        })),
      };
    },
  );

  return previousFeedLists;
}

// 이전 캐시 데이터로 되돌리기
function rollbackFeedLists(
  queryClient: QueryClient,
  snapshot?: FeedListCacheSnapshot,
) {
  snapshot?.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}

/**
 * 피드 목록 조회
 * @returns
 */
export function useReadFeeds(params: FeedListParams) {
  return useInfiniteQuery({
    queryKey: feedQueryKeys.list(params),
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
export function useReadFeed({ feedId }: { feedId?: string }) {
  return useQuery({
    queryKey: feedQueryKeys.item(feedId),
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
  return useMutation({
    mutationFn: async (
      request: CreateFeedRequest,
    ): Promise<FeedAiJobResponseDto> => {
      const formData = ObjectToFormData(request);
      const response = await uploadFetchClient.post({ url: "/feed", formData });
      return response.data;
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
    onSuccess: async (data: FeedResponse) => {
      await optimisticallyUpdateFeedLists(queryClient, (items) =>
        items.map((feed) =>
          feed.id === data.id
            ? {
                ...feed,
                ...data,
              }
            : feed,
        ),
      );
      queryClient.setQueryData([...QUERY_KEY, "item", feedId], data);
    },
  });
}

/**
 * 피드 삭제
 */
export function useDeleteFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await privateApiClient.delete(`/feed/${feedId}`);
      return response.data;
    },
    onMutate: async (feedId: string) => {
      const previousFeedLists = await optimisticallyUpdateFeedLists(
        queryClient,
        (items) => items.filter((feed) => feed.id !== feedId),
      );

      return { previousFeedLists };
    },
    onError: (_, __, context) => {
      rollbackFeedLists(queryClient, context?.previousFeedLists);
    },
    onSuccess: (_, feedId) => {
      queryClient.removeQueries({
        queryKey: [...QUERY_KEY, "item", feedId],
      });
      queryClient.removeQueries({
        queryKey: [...QUERY_KEY, "comments", feedId],
      });
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
      const previousFeedLists = await optimisticallyUpdateFeedLists(
        queryClient,
        (items) =>
          items.map((feed) =>
            feed.id === feedId
              ? {
                  ...feed,
                  isPicked: true,
                  pickCount: feed.pickCount + 1,
                }
              : feed,
          ),
      );

      return { previousFeedLists };
    },
    onError: (_, __, context) => {
      rollbackFeedLists(queryClient, context?.previousFeedLists);
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
      const previousFeedLists = await optimisticallyUpdateFeedLists(
        queryClient,
        (items) =>
          items.map((feed) =>
            feed.id === feedId
              ? {
                  ...feed,
                  isPicked: false,
                  pickCount: Math.max(0, feed.pickCount - 1),
                }
              : feed,
          ),
      );

      return { previousFeedLists };
    },
    onError: (_, __, context) => {
      rollbackFeedLists(queryClient, context?.previousFeedLists);
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
      const previousFeedLists = await optimisticallyUpdateFeedLists(
        queryClient,
        (items) =>
          items.map((feed) =>
            feed.id === feedId
              ? {
                  ...feed,
                  isLiked: true,
                  likeCount: feed.likeCount + 1,
                }
              : feed,
          ),
      );

      return { previousFeedLists };
    },
    onError: (_, __, context) => {
      rollbackFeedLists(queryClient, context?.previousFeedLists);
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
      const previousFeedLists = await optimisticallyUpdateFeedLists(
        queryClient,
        (items) =>
          items.map((feed) =>
            feed.id === feedId
              ? {
                  ...feed,
                  isLiked: false,
                  likeCount: Math.max(0, feed.likeCount - 1),
                }
              : feed,
          ),
      );

      return { previousFeedLists };
    },
    onError: (_, __, context) => {
      rollbackFeedLists(queryClient, context?.previousFeedLists);
    },
  });
}
