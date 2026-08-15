import { authQuery, usersQuery } from "@entities/user";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { env } from "@shared/config";
import { normalizeAuthReturnTo } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import * as AppleAuthentication from "expo-apple-authentication";
import { Href, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

function isAppleLoginCanceled(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_REQUEST_CANCELED"
  );
}

export function useSocialLogin() {
  const { returnTo: returnToParam } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();
  const mutationToServiceAppleLogin = authQuery.useAppleLogin();
  const mutationToServiceGoogleLogin = authQuery.useGoogleLogin();
  const mutationToGuestLogin = authQuery.useGuestLogin();
  const resetCurrentUser = usersQuery.useResetCurrentUser();

  const isGuest = useAuthStore((state) => state.isGuest);
  const setSession = useAuthStore((state) => state.setSession);
  const termsAgreed = useAuthStore((state) => state.termsAgreed);
  const returnTo = normalizeAuthReturnTo(returnToParam);
  const [isAppleLoginAvailable, setIsAppleLoginAvailable] = useState(false);

  const loginLockRef = useRef<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    let isMounted = true;
    AppleAuthentication.isAvailableAsync()
      .then((isAvailable) => {
        if (isMounted) setIsAppleLoginAvailable(isAvailable);
      })
      .catch(() => {
        if (isMounted) setIsAppleLoginAvailable(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const canStartLogin = () => {
    if (loginLockRef.current) {
      return false;
    }
    loginLockRef.current = true;
    return true;
  };

  const finishLogin = () => {
    loginLockRef.current = false;
  };

  const loginWithApple = async () => {
    if (!termsAgreed) {
      throw new Error("Terms agreement is required before login.");
    }
    if (!canStartLogin()) {
      return;
    }
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error("Apple identity token was not provided.");
      }

      const isLinkingGuestAccount = isGuest;
      const response = await mutationToServiceAppleLogin.mutateAsync({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode ?? undefined,
        firstName: credential.fullName?.givenName ?? undefined,
        lastName: credential.fullName?.familyName ?? undefined,
        isGuest: isLinkingGuestAccount,
        termsAgreed,
      });
      await setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        termsAgreed: response.termsAgreed,
      });
      if (isLinkingGuestAccount) {
        await resetCurrentUser();
      }
      if (response.status === "NEED_NICKNAME") {
        router.replace({
          pathname: "/profile/edit",
          params: { returnTo },
        } as Href);
      } else {
        router.replace(returnTo as Href);
      }
    } catch (error) {
      if (isAppleLoginCanceled(error)) return;
      throw error;
    } finally {
      finishLogin();
    }
  };

  // 구글 로그인
  const loginWithGoogle = async () => {
    if (!termsAgreed) {
      throw new Error("Terms agreement is required before login.");
    }
    if (!canStartLogin()) {
      return;
    }
    try {
      GoogleSignin.configure({
        webClientId: env.WEB_GOOGLE_CLIENT_ID,
        iosClientId: env.IOS_GOOGLE_CLIENT_ID,
      });
      await GoogleSignin.hasPlayServices();
      const signInResponse = await GoogleSignin.signIn();
      if (signInResponse.type !== "success") {
        // 구글 로그인 실패
        return;
      }

      const { idToken } = signInResponse.data;
      if (!idToken) {
        // idToken이 없는 경우 처리
        return;
      }
      const isLinkingGuestAccount = isGuest;

      const response = await mutationToServiceGoogleLogin.mutateAsync({
        idToken,
        isGuest: isLinkingGuestAccount,
        termsAgreed,
      });
      await setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        termsAgreed: response.termsAgreed,
      });
      if (isLinkingGuestAccount) {
        await resetCurrentUser();
      }
      if (response.status === "NEED_NICKNAME") {
        router.replace({
          pathname: "/profile/edit",
          params: { returnTo },
        } as Href);
      } else {
        router.replace(returnTo as Href);
      }
    } finally {
      finishLogin();
    }
  };

  const loginToGuest = async () => {
    if (!termsAgreed) {
      throw new Error("Terms agreement is required before login.");
    }
    if (!canStartLogin()) {
      return;
    }
    try {
      const response = await mutationToGuestLogin.mutateAsync({
        termsAgreed,
      });
      if (!response.accessToken) {
        return;
      }
      await setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        termsAgreed: response.termsAgreed,
      });
      router.replace(returnTo as Href);
    } finally {
      finishLogin();
    }
  };

  return {
    loginWithApple,
    loginWithGoogle,
    loginToGuest,
    disabled:
      mutationToServiceAppleLogin.isPending ||
      mutationToServiceGoogleLogin.isPending ||
      mutationToGuestLogin.isPending,
    isAppleLoginAvailable,
    isAppleLoading: mutationToServiceAppleLogin.isPending,
    isGoogleLoading: mutationToServiceGoogleLogin.isPending,
    isGuestLoading: mutationToGuestLogin.isPending,
  };
}
