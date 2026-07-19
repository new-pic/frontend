import { authQuery } from "@entities/user";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { env } from "@shared/config";
import { useAuthStore } from "@shared/model";
import { router } from "expo-router";

export function useSocialLogin() {
  const mutationToServiceLogin = authQuery.useGoogleLogin();
  const mutationToGuestLogin = authQuery.useGuestLogin();

  const login = useAuthStore((state) => state.login);

  // 구글 로그인
  const loginWithGoogle = async () => {
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

    const response = await mutationToServiceLogin.mutateAsync({ idToken });
    // 로그인 성공
    try {
      await login({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      if (response.status === "LOGIN_SUCCESS") {
        router.replace("/feed");
      } else if (response.status === "NEED_NICKNAME") {
        router.push("/profile/edit");
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const loginToGuest = async () => {
    const response = await mutationToGuestLogin.mutateAsync();
    if (!response.accessToken) {
      return;
    }
    try {
      await login({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
    } catch (error) {
      console.error("Error during guest login:", error);
    }
  };

  return {
    loginWithGoogle,
    loginToGuest,
    isLoading: mutationToServiceLogin.isPending,
  };
}
