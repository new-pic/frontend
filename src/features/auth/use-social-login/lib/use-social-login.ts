import { authQuery } from "@entities/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { env } from "@shared/config";

export function useSocialLogin() {
  const muatationToServiceLogin = authQuery.useGoogleLogin();

  // 구글 로그인
  const handleGoogleLogin = async () => {
    try {
      GoogleSignin.configure({
        webClientId: env.WEB_GOOGLE_CLIENT_ID,
        iosClientId: env.IOS_GOOGLE_CLIENT_ID,
      });
      await GoogleSignin.hasPlayServices();
      const signInResponse = await GoogleSignin.signIn();
      if (signInResponse.type === "success") {
        const { idToken } = signInResponse.data;
        return idToken;
      }
      return null;
    } catch (error) {
      console.log("Google login error:", error);
      return null;
    }
  };

  // 소셜 로그인 후 서비스 로그인으로 필요 정보 입력 (닉네임)
  const handleServiceLogin = ({
    nickname,
    idToken,
  }: {
    nickname: string;
    idToken: string | null;
  }) => {
    if (idToken) {
      muatationToServiceLogin.mutate({
        idToken,
        nickname: nickname ?? "UserNickname",
      });
    }
  };

  return {
    handleGoogleLogin,
    handleServiceLogin,
  };
}
