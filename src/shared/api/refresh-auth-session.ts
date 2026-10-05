import { AUTH_SESSION_STORAGE_KEYS, useAuthStore } from "@shared/model";
import * as SecureStore from "expo-secure-store";
import {
  isTerminalAuthRefreshError,
  MissingRefreshTokenError,
} from "./auth-refresh-error";
import { requestTokenRefresh, type TokenRefreshResponse } from "./tokens";

let refreshPromise: Promise<TokenRefreshResponse> | null = null;

interface RefreshAuthSessionOptions {
  refreshToken?: string;
  termsAgreed?: boolean;
}

export async function refreshAuthSession(
  options: RefreshAuthSessionOptions = {},
) {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken =
        options.refreshToken?.trim() ||
        (await SecureStore.getItemAsync(
          AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN,
        ));
      if (!refreshToken) throw new MissingRefreshTokenError();

      const newToken = await requestTokenRefresh(refreshToken);
      await useAuthStore.getState().setRefreshedAccessToken({
        accessToken: newToken.accessToken,
        termsAgreed: options.termsAgreed ?? useAuthStore.getState().termsAgreed,
      });
      return newToken;
    })()
      .catch(async (error) => {
        if (isTerminalAuthRefreshError(error)) {
          await useAuthStore.getState().logout();
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
