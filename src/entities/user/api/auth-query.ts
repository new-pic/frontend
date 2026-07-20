import { apiClient } from "@shared/api";
import { useMutation } from "@tanstack/react-query";

import {
  API_QUERY_KEY,
  GoogleLoginRequest,
  GoogleLoginResponse,
  TokenResponse,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "auth"];

export function useGoogleLogin() {
  return useMutation({
    mutationFn: async (
      data: GoogleLoginRequest,
    ): Promise<GoogleLoginResponse> => {
      const response = await apiClient.post("/auth/google", data);
      return response.data;
    },
  });
}

export function useGuestLogin() {
  return useMutation({
    mutationFn: async (): Promise<TokenResponse> => {
      const response = await apiClient.post("/auth/guest");
      return response.data;
    },
  });
}
