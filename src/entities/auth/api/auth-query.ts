import { ApiInstance } from "@shared/api";
import { useMutation } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";

import { API_QUERY_KEY, GoogleLoginRequest } from "../model";

const QUERY_KEY = [API_QUERY_KEY, "auth"];

export function useGoogleLogin() {
  return useMutation({
    mutationKey: [...QUERY_KEY, "google-login"],
    mutationFn: async (data: GoogleLoginRequest) => {
      const response = await ApiInstance.post("/auth/google", data);
      console.log("Google login response:", response.data);

      await SecureStore.setItemAsync("accessToken", response.data.accessToken);

      return response.data;
    },
  });
}
