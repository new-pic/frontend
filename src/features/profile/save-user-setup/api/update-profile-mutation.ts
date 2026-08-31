import { userQueryKeys } from "@entities/user";
import { uploadFetchClient } from "@shared/api";
import { ObjectToFormData } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ProfileUpdateRequest,
  UpdateProfileRequestSchema,
} from "../model/profile-update-schema";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  return useMutation({
    mutationFn: async (data: ProfileUpdateRequest) => {
      if (useAuthStore.getState().isGuest) {
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
