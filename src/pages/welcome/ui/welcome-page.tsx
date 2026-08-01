import GoogleLogo from "@assets/icons/google-logo.svg";
import { useSocialLogin } from "@features/user/save-social-login";
import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { useState } from "react";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function WelcomPage() {
  const { isLoading, loginWithGoogle, loginToGuest } = useSocialLogin();
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGuestLogin = async () => {
    setLoginError(null);
    try {
      await loginToGuest();
    } catch {
      setLoginError(
        "기기 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch {
      setLoginError("계정 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };
  return (
    <SafeAreaView>
      <VStack className="h-full px-8 justify-center py-8 gap-14">
        <Center>
          <Image
            source={require("@assets/images/brand-character/hello-newpic.png")}
            alt="welcome"
            className="w-full h-70"
            resizeMode="contain"
          />

          <Text>친구들과 찍는 순간을 공유하고</Text>
          <Text>쉽고 빠르게 인생샷을 남겨보세요!</Text>
        </Center>
        <VStack space="lg">
          {loginError ? (
            <Text className="text-center text-destructive" size="sm">
              {loginError}
            </Text>
          ) : null}
          <Button
            variant="outline"
            className="rounded-full"
            disabled={isLoading}
            onPress={handleGoogleLogin}
          >
            <GoogleLogo width={24} height={24} />
            <ButtonText>구글로 시작하기</ButtonText>
          </Button>
          {/* <Button
            variant="outline"
            className="rounded-full bg-black"
            disabled={isLoading}
          >
            <AppleLogo width={24} height={24} />
            <ButtonText className="text-white">애플로 시작하기</ButtonText>
          </Button> */}
          <Button
            variant="ghost"
            disabled={isLoading}
            onPress={handleGuestLogin}
          >
            <ButtonText>로그인 없이 사용하기</ButtonText>
          </Button>
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
