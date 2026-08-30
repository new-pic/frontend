import {
  AppleLoginRequestSchema,
  type AppleLoginRequest,
  GoogleLoginRequestSchema,
  type GoogleLoginRequest,
  GuestLoginRequestSchema,
  type GuestLoginRequest,
  SocialLoginResponseSchema,
  type SocialLoginResponse,
  TokenResponseSchema,
  type TokenResponse,
} from "@entities/user";
import { apiClient, privateApiClient } from "@shared/api";
import { getAndCreateDeviceUUID } from "@shared/lib";
import { useMutation } from "@tanstack/react-query";

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
      const request = AppleLoginRequestSchema.parse(appleCredential);
      const response = await getSocialLoginApiClient(isGuest).post(
        "/auth/apple",
        request,
      );
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
      const request = GoogleLoginRequestSchema.parse({ idToken, termsAgreed });
      const response = await getSocialLoginApiClient(isGuest).post(
        "/auth/google",
        request,
      );
      return SocialLoginResponseSchema.parse(response.data);
    },
  });
}

export function useGuestLogin() {
  return useMutation({
    mutationFn: async ({
      termsAgreed,
    }: Pick<GuestLoginRequest, "termsAgreed">): Promise<TokenResponse> => {
      const request = GuestLoginRequestSchema.parse({
        deviceId: await getAndCreateDeviceUUID(),
        termsAgreed,
      });
      const response = await apiClient.post("/auth/guest", request);
      return TokenResponseSchema.parse(response.data);
    },
  });
}
