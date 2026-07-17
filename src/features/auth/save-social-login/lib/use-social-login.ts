import { authQuery } from "@entities/auth";
import { usersQuery } from "@entities/users";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { env } from "@shared/config";
import { deleteAccessToken, getAccessToken, setAccessToken } from "@shared/lib";
import { router } from "expo-router";

export function useSocialLogin() {
  const mutationToServiceLogin = authQuery.useGoogleLogin();
  const mutationToGuestLogin = authQuery.useGuestLogin();
  const fetchMe = usersQuery.useFetchMe();

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
    await setAccessToken(response.accessToken);
    if (response.status === "LOGIN_SUCCESS") {
      router.replace("/feed");
    } else if (response.status === "NEED_NICKNAME") {
      router.push("/profile/edit");
    }
  };

  // 소셜 로그인 후 서비스 로그인으로 필요 정보 입력 (닉네임)
  const loginWithStoredToken = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      // accessToken이 없는 경우 토스트메시지
      return;
    }
    try {
      await fetchMe();

      router.replace("/feed");
    } catch {
      await deleteAccessToken();
    }
  };

  const loginToGuest = async () => {
    const response = await mutationToGuestLogin.mutateAsync();
    if (!response.accessToken) {
      return;
    }
    await setAccessToken(response.accessToken);
    router.replace("/feed");
  };

  return {
    loginWithGoogle,
    loginWithStoredToken,
    loginToGuest,
    isLoading: mutationToServiceLogin.isPending,
  };
}
