import { AUTH_SESSION_STORAGE_KEYS, useAuthStore } from "@shared/model";
import * as SecureStore from "expo-secure-store";
import { requestTokenRefresh, type TokenRefreshResponse } from "./tokens";

let refreshPromise: Promise<TokenRefreshResponse> | null = null;

export async function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await SecureStore.getItemAsync(
        AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN,
      );
      if (!refreshToken) throw new Error("No refresh token available");

      const newToken = await requestTokenRefresh(refreshToken);
      await useAuthStore.getState().setSession({
        accessToken: newToken.accessToken,
        refreshToken,
        termsAgreed: useAuthStore.getState().termsAgreed,
      });
      return newToken;
    })()
      .catch(async (error) => {
        await useAuthStore.getState().logout();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
