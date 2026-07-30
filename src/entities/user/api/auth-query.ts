import { apiClient, privateApiClient } from "@shared/api";
import { useMutation } from "@tanstack/react-query";

import {
  API_QUERY_KEY,
  getSocialLoginRequestMode,
  GoogleLoginRequest,
  GoogleLoginResponse,
  SOCIAL_LOGIN_REQUEST_MODE,
  TokenResponse,
} from "../model";
import { getAndCreateDeviceUUID } from "../../../shared/lib/device-uuid";

const QUERY_KEY = [API_QUERY_KEY, "auth"];

export function useGoogleLogin() {
  return useMutation({
    mutationFn: async ({
      idToken,
      isGuest,
    }: GoogleLoginRequest & {
      isGuest: boolean;
    }): Promise<GoogleLoginResponse> => {
      const requestMode = getSocialLoginRequestMode(isGuest);
      const apiClientToUse =
        requestMode ===
        SOCIAL_LOGIN_REQUEST_MODE.AUTHENTICATED_ACCOUNT_LINK
          ? privateApiClient
          : apiClient;
      const response = await apiClientToUse.post("/auth/google", { idToken });
      return response.data;
    },
  });
}

export function useGuestLogin() {
  return useMutation({
    mutationFn: async (): Promise<TokenResponse> => {
      const deviceUUID = await getAndCreateDeviceUUID();
      const response = await apiClient.post("/auth/guest", {
        deviceId: deviceUUID,
      });
      return response.data;
    },
  });
}
