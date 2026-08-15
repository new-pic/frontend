import { apiClient, privateApiClient } from "@shared/api";
import { useMutation } from "@tanstack/react-query";

import {
  API_QUERY_KEY,
  AppleLoginRequest,
  AppleLoginRequestSchema,
  AppleLoginResponse,
  AppleLoginResponseSchema,
  getSocialLoginRequestMode,
  GoogleLoginRequest,
  GoogleLoginRequestSchema,
  GoogleLoginResponse,
  GoogleLoginResponseSchema,
  GuestLoginRequest,
  GuestLoginRequestSchema,
  SOCIAL_LOGIN_REQUEST_MODE,
  TokenResponse,
  TokenResponseSchema,
} from "../model";
import { getAndCreateDeviceUUID } from "../../../shared/lib/device-uuid";

const QUERY_KEY = [API_QUERY_KEY, "auth"];

export function useAppleLogin() {
  return useMutation({
    mutationFn: async ({
      isGuest,
      ...appleCredential
    }: AppleLoginRequest & {
      isGuest: boolean;
    }): Promise<AppleLoginResponse> => {
      const requestMode = getSocialLoginRequestMode(isGuest);
      const apiClientToUse =
        requestMode ===
        SOCIAL_LOGIN_REQUEST_MODE.AUTHENTICATED_ACCOUNT_LINK
          ? privateApiClient
          : apiClient;
      const request = AppleLoginRequestSchema.parse(appleCredential);
      const response = await apiClientToUse.post("/auth/apple", request);
      return AppleLoginResponseSchema.parse(response.data);
    },
  });
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: async ({
      idToken,
      isGuest,
      termsAgreed,
    }: GoogleLoginRequest & {
      isGuest: boolean;
    }): Promise<GoogleLoginResponse> => {
      const requestMode = getSocialLoginRequestMode(isGuest);
      const apiClientToUse =
        requestMode ===
        SOCIAL_LOGIN_REQUEST_MODE.AUTHENTICATED_ACCOUNT_LINK
          ? privateApiClient
          : apiClient;
      const request = GoogleLoginRequestSchema.parse({
        idToken,
        termsAgreed,
      });
      const response = await apiClientToUse.post("/auth/google", request);
      return GoogleLoginResponseSchema.parse(response.data);
    },
  });
}

export function useGuestLogin() {
  return useMutation({
    mutationFn: async ({
      termsAgreed,
    }: Pick<GuestLoginRequest, "termsAgreed">): Promise<TokenResponse> => {
      const deviceUUID = await getAndCreateDeviceUUID();
      const request = GuestLoginRequestSchema.parse({
        deviceId: deviceUUID,
        termsAgreed,
      });
      const response = await apiClient.post("/auth/guest", request);
      return TokenResponseSchema.parse(response.data);
    },
  });
}
