import {
  type ProfileRequest,
  UpdateProfileRequestSchema,
  userQueryKeys,
} from "@entities/user";
import { uploadFetchClient } from "@shared/api";
import { ObjectToFormData } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  return useMutation({
    mutationFn: async (data: ProfileRequest) => {
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
