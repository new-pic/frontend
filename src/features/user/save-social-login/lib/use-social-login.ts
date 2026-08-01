import { authQuery } from "@entities/user";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { env } from "@shared/config";
import { normalizeAuthReturnTo } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";

export function useSocialLogin() {
  const { returnTo: returnToParam } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();
  const mutationToServiceLogin = authQuery.useGoogleLogin();
  const mutationToGuestLogin = authQuery.useGuestLogin();

  const isGuest = useAuthStore((state) => state.isGuest);
  const setSession = useAuthStore((state) => state.setSession);
  const termsAgreed = useAuthStore((state) => state.termsAgreed);
  const returnTo = normalizeAuthReturnTo(returnToParam);

  // 구글 로그인
  const loginWithGoogle = async () => {
    if (!termsAgreed) {
      throw new Error("Terms agreement is required before login.");
    }

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

    const response = await mutationToServiceLogin.mutateAsync({
      idToken,
      isGuest,
      termsAgreed,
    });
    await setSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      termsAgreed: response.termsAgreed,
    });
    if (response.status === "LOGIN_SUCCESS") {
      router.replace(returnTo as Href);
    } else if (response.status === "NEED_NICKNAME") {
      router.replace({
        pathname: "/profile/edit",
        params: { returnTo },
      } as Href);
    }
  };

  const loginToGuest = async () => {
    if (!termsAgreed) {
      throw new Error("Terms agreement is required before login.");
    }

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
  };

  return {
    loginWithGoogle,
    loginToGuest,
    isLoading:
      mutationToServiceLogin.isPending || mutationToGuestLogin.isPending,
  };
}
