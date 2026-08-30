import type { BlockedUserListResponse, PaginationParams } from "@entities/user";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useInfiniteQuery } from "@tanstack/react-query";
import { profilePageQueryKeys } from "../model/query-keys";

export function useReadBlockedUsers(params: PaginationParams) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isGuest = useAuthStore((state) => state.isGuest);
  const userId = useAuthStore((state) => state.userId);

  return useInfiniteQuery({
    queryKey: profilePageQueryKeys.blockedUserList(userId, params),
    queryFn: async ({
      pageParam,
      signal,
    }): Promise<BlockedUserListResponse> => {
      if (!userId || useAuthStore.getState().isGuest) {
        throw new Error("Cannot fetch blocked users without a user session");
      }
      const response = await privateApiClient.get("/users/me/blocks", {
        params: { ...params, cursor: pageParam },
        signal,
      });
      return response.data;
    },
    initialPageParam: params.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(userId && accessToken) && !isGuest,
    staleTime: 1000 * 60 * 5,
  });
}
