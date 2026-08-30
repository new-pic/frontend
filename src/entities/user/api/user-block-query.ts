import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
} from "@tanstack/react-query";
import type {
  BlockedUserListResponse,
  BlockUserResponse,
  PaginationParams,
  UnblockUserResponse,
} from "../model";
import { userQueryKeys } from "../model";

export function blockedUsersInfiniteQueryOptions(
  userId: string | null,
  params: PaginationParams,
) {
  return infiniteQueryOptions({
    queryKey: userQueryKeys.blockList(userId, params),
    queryFn: async ({
      pageParam,
      signal,
    }): Promise<BlockedUserListResponse> => {
      if (!userId || useAuthStore.getState().isGuest) {
        throw new Error("Cannot fetch blocked users without a user session");
      }
      const response = await privateApiClient.get("/users/me/blocks", {
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
  });
}

export function useReadBlockedUsers(params: PaginationParams) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isGuest = useAuthStore((state) => state.isGuest);
  const userId = useAuthStore((state) => state.userId);

  return useInfiniteQuery({
    ...blockedUsersInfiniteQueryOptions(userId, params),
    enabled: Boolean(userId && accessToken) && !isGuest,
  });
}

export function useBlockUser() {
  return useMutation({
    mutationFn: async (userId: string): Promise<BlockUserResponse> => {
      if (useAuthStore.getState().isGuest) {
        throw new Error("Member account is required.");
      }

      const response = await privateApiClient.post(`/users/${userId}/block`);
      return response.data;
    },
  });
}

export function useUnblockUser() {
  return useMutation({
    mutationFn: async (userId: string): Promise<UnblockUserResponse> => {
      if (useAuthStore.getState().isGuest) {
        throw new Error("Member account is required.");
      }

      const response = await privateApiClient.delete(`/users/${userId}/block`);
      return response.data;
    },
  });
}
