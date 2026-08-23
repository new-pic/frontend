import AppleLogo from "@assets/icons/apple-logo.svg";
import GoogleLogo from "@assets/icons/google-logo.svg";
import { useSocialLogin } from "@features/user/save-social-login";
import { EXTERNAL_LINKS } from "@shared/constants";
import { useAuthStore } from "@shared/model";
import {
  Button,
  ButtonSpinner,
  ButtonText,
  Center,
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import { IconCheck } from "@tabler/icons-react-native";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Alert, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function WelcomPage() {
  const {
    disabled,
    isAppleLoginAvailable,
    isAppleLoading,
    isGuestLoading,
    isGoogleLoading,
    loginWithApple,
    loginWithGoogle,
    loginToGuest,
  } = useSocialLogin();
  const [loginError, setLoginError] = useState<string | null>(null);
  const termsAgreed = useAuthStore((state) => state.termsAgreed);
  const hasExistingSession = useAuthStore((state) =>
    Boolean(state.accessToken),
  );
  const setTermsAgreed = useAuthStore((state) => state.setTermsAgreed);

  const ensureTermsAgreed = () => {
    if (termsAgreed) return true;

    Alert.alert(
      "이용약관 동의 필요",
      "서비스를 시작하려면 이용약관에 동의해주세요.",
    );
    return false;
  };

  const handleLogin = async ({
    loginFn,
    errorMessage,
  }: {
    loginFn: () => Promise<void>;
    errorMessage: string;
  }) => {
    if (!ensureTermsAgreed()) return;

    setLoginError(null);
    try {
      await loginFn();
    } catch {
      setLoginError(errorMessage);
    }
  };

  const handleGuestLogin = async () => {
    handleLogin({
      loginFn: loginToGuest,
      errorMessage: "게스트 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.",
    });
  };

  const handleGoogleLogin = async () => {
    handleLogin({
      loginFn: loginWithGoogle,
      errorMessage: "계정 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
    });
  };

  const handleAppleLogin = async () => {
    handleLogin({
      loginFn: loginWithApple,
      errorMessage: "계정 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
    });
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(EXTERNAL_LINKS.TERMS_OF_SERVICE);
      setTermsAgreed(true);
    } catch {
      Alert.alert(
        "페이지 연결 실패",
        "이용약관 페이지를 열지 못했습니다. 다시 시도해주세요.",
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
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
            disabled={disabled}
            isLoading={isGoogleLoading}
            onPress={handleGoogleLogin}
          >
            <GoogleLogo width={24} height={24} />
            <ButtonText>구글로 시작하기</ButtonText>
          </Button>
          {isAppleLoginAvailable ? (
            <Button
              variant="outline"
              className="rounded-full bg-black"
              disabled={disabled}
              onPress={handleAppleLogin}
            >
              {isAppleLoading ? (
                <ButtonSpinner color="white" />
              ) : (
                <>
                  <AppleLogo width={24} height={24} />
                  <ButtonText className="text-white">
                    애플로 시작하기
                  </ButtonText>
                </>
              )}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            disabled={disabled}
            isLoading={isGuestLoading}
            onPress={handleGuestLogin}
          >
            <ButtonText>로그인 없이 사용하기</ButtonText>
          </Button>
        </VStack>
        <HStack className="absolute bottom-0 left-8 right-8 items-center justify-center">
          <Checkbox
            value="terms-agreed"
            className="h-11 w-11 justify-center"
            isChecked={termsAgreed}
            isDisabled={disabled || hasExistingSession}
            onChange={setTermsAgreed}
            accessibilityLabel="이용약관 및 개인정보 처리방침 동의"
          >
            <CheckboxIndicator className="h-6 w-6 rounded-md">
              <CheckboxIcon as={IconCheck} className="h-4 w-4" />
            </CheckboxIndicator>
          </Checkbox>
          <Pressable
            className="min-h-11 justify-center"
            disabled={disabled}
            accessibilityRole="link"
            onPress={handleOpenTermsOfService}
          >
            <Text size="sm">
              <Text className="font-semibold text-link-text underline">
                이용약관 및 개인정보 처리방침
              </Text>
              에 동의합니다.
            </Text>
          </Pressable>
        </HStack>
      </VStack>
    </SafeAreaView>
  );
}
