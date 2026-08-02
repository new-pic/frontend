import type { FeedListResponse } from "@entities/feed";
import { privateApiClient, uploadFetchClient } from "@shared/api";
import { ObjectToFormData } from "@shared/lib";
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
  UpdateProfileRequestSchema,
  UserProfile,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "user"] as const;

export const userQueryKeys = {
  all: QUERY_KEY,
  meAll: [...QUERY_KEY, "me"] as const,
  me: (userId: string | null) =>
    [...QUERY_KEY, "me", getUserQueryIdentity(userId)] as const,
  myFeeds: [...QUERY_KEY, "me", "feeds"] as const,
  myFeedList: (params: PaginationParams) =>
    [...QUERY_KEY, "me", "feeds", params] as const,
  likedFeeds: [...QUERY_KEY, "me", "liked-feeds"] as const,
  likedFeedList: (params: PaginationParams) =>
    [...QUERY_KEY, "me", "liked-feeds", params] as const,
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
    queryFn: async (): Promise<UserProfile> => {
      const response = await privateApiClient.get("/users/me");
      return response.data;
    },
    enabled: Boolean(userId && accessToken) && (options?.enabled ?? true),
  });
}

/**
 * 내가 올린 피드 목록 조회
 */
export function useReadMyFeeds(params: PaginationParams) {
  const isGuest = useAuthStore((state) => state.isGuest);

  return useInfiniteQuery({
    ...myFeedsInfiniteQueryOptions(params),
    enabled: !isGuest,
  });
}

export function myFeedsInfiniteQueryOptions(params: PaginationParams) {
  const isGuest = useAuthStore.getState().isGuest;
  return infiniteQueryOptions({
    queryKey: userQueryKeys.myFeedList(params),
    queryFn: async ({ pageParam, signal }): Promise<FeedListResponse> => {
      const response = await privateApiClient.get("/users/me/feeds", {
        params: {
          ...params,
          cursor: pageParam,
        },
        signal,
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
  const isGuest = useAuthStore((state) => state.isGuest);

  return useInfiniteQuery({
    ...likedFeedsInfiniteQueryOptions(params),
    enabled: !isGuest,
  });
}

export function likedFeedsInfiniteQueryOptions(params: PaginationParams) {
  return infiniteQueryOptions({
    queryKey: userQueryKeys.likedFeedList(params),
    queryFn: async ({ pageParam, signal }): Promise<FeedListResponse> => {
      const response = await privateApiClient.get("/users/me/liked-feeds", {
        params: {
          ...params,
          cursor: pageParam,
        },
        signal,
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
  const isGuest = useAuthStore((state) => state.isGuest);
  return useInfiniteQuery({
    queryKey: userQueryKeys.savedFeedList(params),
    queryFn: async ({ pageParam, signal }): Promise<FeedListResponse> => {
      const response = await privateApiClient.get("/users/me/references", {
        params: {
          ...params,
          cursor: pageParam,
        },
        signal,
      });
      return response.data;
    },
    initialPageParam: params.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 60 * 5,
    enabled: !isGuest && (options?.enabled ?? true),
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
      const isGuest = useAuthStore.getState().isGuest;

      if (isGuest) {
        throw new Error("Member account is required.");
      }
      const request = UpdateProfileRequestSchema.parse(data);
      const response = await uploadFetchClient.patch({
        url: "/users/me",
        formData: ObjectToFormData(request),
      });
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.me(userId),
      });
    },
  });
}

export function useResetCurrentUser() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.resetQueries({
      queryKey: userQueryKeys.meAll,
    });
  };
}
