import {
  AUTH_ACCESS_TOKEN_EXPIRY_LEEWAY_MS,
  isTerminalAuthRefreshError,
  refreshAuthSession,
} from "@shared/api";
import { decodeAccessToken } from "@shared/lib/jwt";
import { AUTH_SESSION_STORAGE_KEYS, useAuthStore } from "@shared/model";
import * as SecureStore from "expo-secure-store";

type AuthRecoveryAction =
  | { type: "finish-without-session" }
  | { type: "clear-incomplete-session" }
  | { type: "restore"; accessToken: string }
  | { type: "refresh"; refreshToken: string };

function normalizeToken(token: string | null) {
  return token?.trim() || null;
}

export function resolveAuthRecoveryAction({
  accessToken,
  refreshToken,
  nowMs = Date.now(),
}: {
  accessToken: string | null;
  refreshToken: string | null;
  nowMs?: number;
}): AuthRecoveryAction {
  const normalizedAccessToken = normalizeToken(accessToken);
  const normalizedRefreshToken = normalizeToken(refreshToken);

  if (!normalizedAccessToken && !normalizedRefreshToken) {
    return { type: "finish-without-session" };
  }
  if (!normalizedRefreshToken) {
    return { type: "clear-incomplete-session" };
  }
  if (
    !normalizedAccessToken ||
    decodeAccessToken.isExpired(
      normalizedAccessToken,
      nowMs,
      AUTH_ACCESS_TOKEN_EXPIRY_LEEWAY_MS,
    )
  ) {
    return { type: "refresh", refreshToken: normalizedRefreshToken };
  }

  return { type: "restore", accessToken: normalizedAccessToken };
}

let recoveryPromise: Promise<void> | null = null;

async function performAuthRecovery() {
  useAuthStore.getState().beginAuthRecovery();

  let accessToken: string | null;
  let refreshToken: string | null;

  try {
    [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.getItemAsync(AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  } catch {
    useAuthStore.getState().failAuthRecovery();
    return;
  }

  const action = resolveAuthRecoveryAction({ accessToken, refreshToken });

  if (action.type === "finish-without-session") {
    useAuthStore.getState().finishAuthRecoveryWithoutSession();
    return;
  }
  if (action.type === "clear-incomplete-session") {
    await useAuthStore.getState().logout();
    return;
  }
  if (action.type === "restore") {
    useAuthStore.getState().restorePersistedSession(action.accessToken);
    return;
  }

  try {
    await refreshAuthSession({
      refreshToken: action.refreshToken,
      termsAgreed: true,
    });
  } catch (error) {
    if (!isTerminalAuthRefreshError(error)) {
      useAuthStore.getState().failAuthRecovery();
    }
  }
}

export function recoverAuthSession() {
  if (!recoveryPromise) {
    recoveryPromise = performAuthRecovery().finally(() => {
      recoveryPromise = null;
    });
  }

  return recoveryPromise;
}
