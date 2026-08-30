import {
  getApiErrorMessage,
  privateApiClient,
  uploadFetchClient,
} from "@shared/api";
import { ObjectToFormData } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProfileRequest,
  UpdateProfileRequestSchema,
  userQueryKeys,
  UserProfile,
} from "../model";

const ACCOUNT_WITHDRAWAL_PENDING_MESSAGE = "탈퇴 유예 중";

function isAccountWithdrawalPendingError(error: unknown) {
  return getApiErrorMessage(error, "").includes(
    ACCOUNT_WITHDRAWAL_PENDING_MESSAGE,
  );
}

/**
 * 내 정보 조회
 * @returns
 */
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

/**
 * 내 정보 조회 (훅 내부 등에서 fetchQuery를 사용하여 데이터를 가져오는 함수)
 * @returns
 */
export function useFetchMe() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  const fetchMe = async () => {
    if (!userId || useAuthStore.getState().isGuest) {
      throw new Error("Cannot fetch a profile without a member session");
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

/**
 * 회원 탈퇴 유예 요청
 */
export function useRequestAccountWithdrawal() {
  return useMutation({
    mutationFn: async () => {
      try {
        await privateApiClient.delete("/users/me");
      } catch (error) {
        if (isAccountWithdrawalPendingError(error)) return;
        throw error;
      }
    },
  });
}
