import { decodeAccessToken } from "@shared/lib/jwt";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const parseTokenState = (token: string | null) => {
  if (!token) {
    return { userId: null, isGuest: false };
  }
  const decodedUserId = decodeAccessToken.userId(token);
  const decodedUserType = decodeAccessToken.userType(token);
  return {
    userId: decodedUserId,
    isGuest: decodedUserType === "guest",
  };
};

interface AuthStore {
  accessToken: string | null;
  userId: string | null;
  isLoggedIn: boolean;
  isGuest: boolean;
  isInitialized: boolean;

  setSession: ({
    accessToken,
    refreshToken,
  }: {
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  setUserId: (userId: string) => void;
  logout: () => Promise<void>;
  prepareGoogleLink: () => void;
  initializeAuthState: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  accessToken: null,
  userId: null,
  isLoggedIn: false,
  isGuest: false,
  isInitialized: false,

  setSession: async ({ accessToken, refreshToken }) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    const { userId, isGuest } = parseTokenState(accessToken);

    set(() => ({
      accessToken,
      userId,
      isGuest,
      isLoggedIn: true,
      isInitialized: true,
    }));
  },
  setUserId: (userId) => set(() => ({ userId })),
  logout: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set(() => ({
      accessToken: null,
      userId: null,
      isLoggedIn: false,
      isGuest: false,
      isInitialized: true,
    }));
  },
  prepareGoogleLink: () => set(() => ({ isGuest: true, isLoggedIn: false })),
  initializeAuthState: async () => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const { userId, isGuest } = parseTokenState(token);

      if (token) {
        set({
          isLoggedIn: true,
          accessToken: token,
          userId,
          isGuest,
          isInitialized: true,
        });
      } else {
        // 토큰이 없다면 게스트 상태이거나 첫 진입
        set({
          isLoggedIn: false,
          accessToken: null,
          userId: null,
          isGuest,
          isInitialized: true,
        });
      }
    } catch {
      set({
        isLoggedIn: false,
        accessToken: null,
        userId: null,
        isGuest: false,
        isInitialized: true,
      });
    }
  },
}));
