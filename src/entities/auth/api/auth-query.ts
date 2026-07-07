import { ApiInstance } from "@shared/api";
import { useMutation } from "@tanstack/react-query";

import {
  API_QUERY_KEY,
  GoogleLoginRequest,
  GoogleLoginResponse,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "auth"];

export function useGoogleLogin() {
  return useMutation({
    mutationKey: [...QUERY_KEY, "google-login"],
    mutationFn: async (
      data: GoogleLoginRequest,
    ): Promise<GoogleLoginResponse> => {
      const response = await ApiInstance.post("/auth/google", data);
      return response.data;
    },
  });
}
