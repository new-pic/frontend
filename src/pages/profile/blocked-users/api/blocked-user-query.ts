import type { BlockedUserListResponse } from "@entities/user";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { BlockedUserListParams } from "../model/blocked-user-list";
import { blockedUsersPageQueryKeys } from "../model/query-keys";

export function useReadBlockedUsers(params: BlockedUserListParams) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.userId);

  return useInfiniteQuery({
    queryKey: blockedUsersPageQueryKeys.blockedUserList(userId, params),
    queryFn: async ({
      pageParam,
      signal,
    }): Promise<BlockedUserListResponse> => {
      if (!userId) {
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
    enabled: Boolean(userId && accessToken),
    staleTime: 1000 * 60 * 5,
  });
}
