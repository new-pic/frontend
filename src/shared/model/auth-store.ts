import { decodeAccessToken } from "@shared/lib/jwt";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { AUTH_ENTRY_INTENT, type AuthEntryIntent } from "./auth-entry-intent";
import {
  AUTH_SESSION_STORAGE_KEYS,
  clearPersistedAuthSession,
} from "./auth-session-storage";

const { ACCESS_TOKEN: ACCESS_TOKEN_KEY, REFRESH_TOKEN: REFRESH_TOKEN_KEY } =
  AUTH_SESSION_STORAGE_KEYS;

const parseTokenState = (token: string | null) => {
  if (!token) {
    return { userId: null, isGuest: false };
  }
  const decodedUserId = decodeAccessToken.userId(token);
  const decodedUserType = decodeAccessToken.userType(token);
  return {
    userId: decodedUserId,
    isGuest: decodedUserType === "GUEST",
  };
};

interface AuthStore {
  accessToken: string | null;
  userId: string | null;
  isGuest: boolean;
  isInitialized: boolean;
  termsAgreed: boolean;
  authEntryIntent: AuthEntryIntent;

  setSession: ({
    accessToken,
    refreshToken,
    termsAgreed,
  }: {
    accessToken: string;
    refreshToken: string;
    termsAgreed: boolean;
  }) => Promise<void>;
  setTermsAgreed: (termsAgreed: boolean) => void;
  logout: () => Promise<void>;
  prepareAccountLink: () => void;
  initializeAuthState: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  accessToken: null,
  userId: null,
  isGuest: false,
  isInitialized: false,
  termsAgreed: false,
  authEntryIntent: AUTH_ENTRY_INTENT.DEFAULT,

  setSession: async ({ accessToken, refreshToken, termsAgreed }) => {
    if (!termsAgreed) {
      throw new Error("Terms agreement is required to persist a session.");
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    const { userId, isGuest } = parseTokenState(accessToken);

    set(() => ({
      accessToken,
      userId,
      isGuest,
      isInitialized: true,
      termsAgreed: true,
      authEntryIntent: AUTH_ENTRY_INTENT.DEFAULT,
    }));
  },
  setTermsAgreed: (termsAgreed) =>
    set((state) => ({
      termsAgreed: state.accessToken ? true : termsAgreed,
    })),
  logout: async () => {
    let failedKeys: string[] = [];

    try {
      ({ failedKeys } = await clearPersistedAuthSession(
        SecureStore.deleteItemAsync,
      ));
    } finally {
      set(() => ({
        accessToken: null,
        userId: null,
        isGuest: false,
        isInitialized: true,
        termsAgreed: false,
        authEntryIntent: AUTH_ENTRY_INTENT.DEFAULT,
      }));
    }

    if (failedKeys.length > 0) {
      console.warn("[AuthStore] persisted session cleanup incomplete", {
        failedKeys,
      });
    }
  },
  prepareAccountLink: () =>
    set(() => ({
      authEntryIntent: AUTH_ENTRY_INTENT.LINK_GUEST_ACCOUNT,
    })),
  initializeAuthState: async () => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const { userId, isGuest } = parseTokenState(token);

      if (token) {
        set({
          accessToken: token,
          userId,
          isGuest,
          isInitialized: true,
          termsAgreed: true,
          authEntryIntent: AUTH_ENTRY_INTENT.DEFAULT,
        });
      } else {
        // 토큰이 없다면 게스트 상태이거나 첫 진입
        set({
          accessToken: null,
          userId: null,
          isGuest,
          isInitialized: true,
          termsAgreed: false,
          authEntryIntent: AUTH_ENTRY_INTENT.DEFAULT,
        });
      }
    } catch {
      set({
        accessToken: null,
        userId: null,
        isGuest: false,
        isInitialized: true,
        termsAgreed: false,
        authEntryIntent: AUTH_ENTRY_INTENT.DEFAULT,
      });
    }
  },
}));
