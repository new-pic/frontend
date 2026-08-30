import type { BlockUserResponse, UnblockUserResponse } from "@entities/user";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useMutation } from "@tanstack/react-query";

export function useBlockUserMutation() {
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

export function useUnblockUserMutation() {
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
