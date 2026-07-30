import { privateApiClient } from "@shared/api";
import type { FeedListResponse } from "@entities/feed";
import { useAuthStore } from "@shared/model";
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  API_QUERY_KEY,
  getUserQueryIdentity,
  PaginationParams,
  ProfileRequest,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "user"] as const;

export const userQueryKeys = {
  all: QUERY_KEY,
  meAll: [...QUERY_KEY, "me"] as const,
  me: (userId: string | null) =>
    [
      ...QUERY_KEY,
      "me",
      getUserQueryIdentity(userId),
    ] as const,
  myFeeds: [...QUERY_KEY, "me", "feeds"] as const,
  savedFeeds: [...QUERY_KEY, "me", "saved-feeds"] as const,
  savedFeedList: (params: PaginationParams) =>
    [...QUERY_KEY, "me", "saved-feeds", params] as const,
} as const;

/**
 * 내 정보 조회
 * @returns
 */
export function useReadMe(options?: { enabled?: boolean }) {
  const userId = useAuthStore((state) => state.userId);
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: userQueryKeys.me(userId),
    queryFn: async () => {
      const response = await privateApiClient.get("/users/me");
      return response.data;
    },
    enabled:
      Boolean(userId && accessToken) && (options?.enabled ?? true),
  });
}

/**
 * 내가 올린 피드 목록 조회
 */
export function useReadMyFeeds(params: PaginationParams) {
  return useInfiniteQuery({
    queryKey: [...userQueryKeys.myFeeds, params],
    queryFn: async ({ pageParam }) => {
      const response = await privateApiClient.get("/users/me/feeds", {
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
 * 내가 좋아요한 피드 조회
 * @returns
 */
export function useReadLikedFeeds(params: PaginationParams) {
  return useInfiniteQuery({
    queryKey: [...QUERY_KEY, "me", "liked-feeds"],
    queryFn: async ({ pageParam }) => {
      const response = await privateApiClient.get("/users/me/liked-feeds", {
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
 * 내가 저장한 피드 조회 (카메라 오버레이로 사용할 수 있는 레퍼런스 이미지)
 * @returns
 */
export function useReadSavedFeeds(
  params: PaginationParams,
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    ...savedFeedsInfiniteQueryOptions(params),
    enabled: options?.enabled,
  });
}

export function savedFeedsInfiniteQueryOptions(
  params: PaginationParams,
) {
  return infiniteQueryOptions({
    queryKey: userQueryKeys.savedFeedList(params),
    queryFn: async ({ pageParam, signal }): Promise<FeedListResponse> => {
      const response = await privateApiClient.get(
        "/users/me/references",
        {
          params: {
            ...params,
            cursor: pageParam,
          },
          signal,
        },
      );
      return response.data;
    },
    initialPageParam: params.cursor,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * 내 정보 조회 (훅 내부 등에서 fetchQuery를 사용하여 데이터를 가져오는 함수)
 * @returns
 */
export function useFetchMe() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  const fetchMe = async () => {
    if (!userId) {
      throw new Error("Cannot fetch a profile without a user session");
    }

    return await queryClient.fetchQuery({
      queryKey: userQueryKeys.me(userId),
      queryFn: async () => {
        const response = await privateApiClient.get("/users/me");
        return response.data;
      },
      staleTime: 1000 * 60 * 5,
    });
  };

  return fetchMe;
}

/**
 * 내 프로필 수정
 * @returns
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  return useMutation({
    mutationFn: async (data: ProfileRequest) => {
      const response = await privateApiClient.patch("/users/me", data);
      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.me(userId),
      });
      return response.data;
    },
  });
}
