import { privateApiClient } from "@shared/api";
import { useMutation } from "@tanstack/react-query";

interface BlockUserResponse {
  blocked: true;
  id: string;
  blockedUserId: string;
  createdAt: string;
}

interface UnblockUserResponse {
  blocked: false;
  blockedUserId: string;
}

export function useBlockUserMutation() {
  return useMutation({
    mutationFn: async (userId: string): Promise<BlockUserResponse> => {
      const response = await privateApiClient.post(`/users/${userId}/block`);
      return response.data;
    },
  });
}

export function useUnblockUserMutation() {
  return useMutation({
    mutationFn: async (userId: string): Promise<UnblockUserResponse> => {
      const response = await privateApiClient.delete(`/users/${userId}/block`);
      return response.data;
    },
  });
}
