import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userQueryKeys, type UserProfile } from "../model";

/** 여러 Profile 화면이 공유하는 현재 회원 정보를 조회합니다. */
export function useReadMe(options?: { enabled?: boolean }) {
  const userId = useAuthStore((state) => state.userId);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isGuest = useAuthStore((state) => state.isGuest);

  return useQuery({
    queryKey: userQueryKeys.me(userId),
    queryFn: async (): Promise<UserProfile> => {
      if (!userId || useAuthStore.getState().isGuest) {
        throw new Error("Cannot fetch a profile without a member session");
      }
      const response = await privateApiClient.get("/users/me");
      return response.data;
    },
    enabled:
      Boolean(userId && accessToken) && !isGuest && (options?.enabled ?? true),
  });
}

export function useFetchMe() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  return async () => {
    if (!userId || useAuthStore.getState().isGuest) {
      throw new Error("Cannot fetch a profile without a member session");
    }
    return queryClient.fetchQuery({
      queryKey: userQueryKeys.me(userId),
      queryFn: async (): Promise<UserProfile> => {
        const response = await privateApiClient.get("/users/me");
        return response.data;
      },
      staleTime: 1000 * 60 * 5,
    });
  };
}
