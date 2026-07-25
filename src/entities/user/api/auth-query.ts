import { apiClient, privateApiClient } from "@shared/api";
import { useMutation } from "@tanstack/react-query";

import {
  API_QUERY_KEY,
  GoogleLoginRequest,
  GoogleLoginResponse,
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
      // 게스트 로그인 여부에 따라 적절한 API 클라이언트를 선택합니다.
      const apiClientToUse = isGuest ? privateApiClient : apiClient;
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
