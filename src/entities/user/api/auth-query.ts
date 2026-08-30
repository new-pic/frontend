import { apiClient, privateApiClient } from "@shared/api";
import { useMutation } from "@tanstack/react-query";

import { getAndCreateDeviceUUID } from "@shared/lib";
import {
  AppleLoginRequest,
  AppleLoginRequestSchema,
  GoogleLoginRequest,
  GoogleLoginRequestSchema,
  GuestLoginRequest,
  GuestLoginRequestSchema,
  SocialLoginResponse,
  SocialLoginResponseSchema,
  TokenResponse,
  TokenResponseSchema,
} from "../model";

function getSocialLoginApiClient(isGuest: boolean) {
  return isGuest ? privateApiClient : apiClient;
}

export function useAppleLogin() {
  return useMutation({
    mutationFn: async ({
      isGuest,
      ...appleCredential
    }: AppleLoginRequest & {
      isGuest: boolean;
    }): Promise<SocialLoginResponse> => {
      const client = getSocialLoginApiClient(isGuest);
      const request = AppleLoginRequestSchema.parse(appleCredential);
      const response = await client.post("/auth/apple", request);
      return SocialLoginResponseSchema.parse(response.data);
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
    }): Promise<SocialLoginResponse> => {
      const client = getSocialLoginApiClient(isGuest);
      const request = GoogleLoginRequestSchema.parse({
        idToken,
        termsAgreed,
      });
      const response = await client.post("/auth/google", request);
      return SocialLoginResponseSchema.parse(response.data);
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
