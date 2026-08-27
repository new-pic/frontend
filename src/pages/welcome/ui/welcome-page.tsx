import AppleLogo from "@assets/icons/apple-logo.svg";
import GoogleLogo from "@assets/icons/google-logo.svg";
import { useSocialLogin } from "@features/user/save-social-login";
import { EXTERNAL_LINKS } from "@shared/constants";
import { useAuthStore } from "@shared/model";
import {
  Button,
  ButtonSpinner,
  ButtonText,
  Card,
  Center,
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
  CheckboxLabel,
  Text,
  VStack,
} from "@shared/ui";
import { IconCheck } from "@tabler/icons-react-native";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function WelcomPage() {
  const { disabled, appleLogin, googleLogin, guestLogin } = useSocialLogin();
  const [loginError, setLoginError] = useState<string | null>(null);
  const termsAgreed = useAuthStore((state) => state.termsAgreed);
  const hasExistingSession = useAuthStore((state) =>
    Boolean(state.accessToken),
  );
  const setTermsAgreed = useAuthStore((state) => state.setTermsAgreed);

  const ensureTermsAgreed = () => {
    if (termsAgreed) return true;

    Alert.alert(
      "필수 약관 동의 필요",
      "서비스를 시작하려면 안내 내용을 확인하고 이용약관과 개인정보 처리방침에 동의해주세요.",
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

  const handleGuestLogin = () => {
    return handleLogin({
      loginFn: guestLogin.login,
      errorMessage: "게스트 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.",
    });
  };

  const handleGoogleLogin = () => {
    return handleLogin({
      loginFn: googleLogin.login,
      errorMessage: "계정 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
    });
  };

  const handleAppleLogin = () => {
    return handleLogin({
      loginFn: appleLogin.login,
      errorMessage: "계정 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
    });
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(EXTERNAL_LINKS.TERMS_OF_SERVICE);
    } catch {
      Alert.alert(
        "페이지 연결 실패",
        "이용약관 및 개인정보 처리방침 페이지를 열지 못했습니다. 다시 시도해주세요.",
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 32,
          paddingVertical: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <VStack className="flex-1 justify-center gap-10">
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
              isLoading={googleLogin.isLoading}
              onPress={handleGoogleLogin}
            >
              <GoogleLogo width={24} height={24} />
              <ButtonText>구글로 시작하기</ButtonText>
            </Button>
            {appleLogin.isAvailable ? (
              <Button
                variant="outline"
                className="rounded-full bg-black"
                disabled={disabled}
                onPress={handleAppleLogin}
              >
                {appleLogin.isLoading ? (
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
              isLoading={guestLogin.isLoading}
              onPress={handleGuestLogin}
            >
              <ButtonText>로그인 없이 사용하기</ButtonText>
            </Button>
          </VStack>

          <Card size="sm" className="gap-3 shadow-none">
            <Text size="sm" className="font-semibold">
              NewPic 서비스 이용 전 아래 내용을 확인해주세요.
            </Text>
            <VStack className="gap-1">
              <Text size="xs">
                • 로그인 및 계정 관리를 위해 소셜 로그인 정보 또는 기기
                식별 정보, 닉네임과 선택한 프로필 사진을 처리합니다.
              </Text>
              <Text size="xs">
                • 촬영하거나 업로드한 사진과 작성한 피드·댓글은 촬영, 공유
                및 커뮤니티 기능 제공에 사용됩니다.
              </Text>
              <Text size="xs">
                • 수집 항목, 이용 목적, 보관 기간 및 삭제 방법은 아래
                개인정보 처리방침에서 확인할 수 있습니다.
              </Text>
            </VStack>
            <Pressable
              className="min-h-11 self-start justify-center"
              disabled={disabled}
              accessibilityRole="link"
              accessibilityLabel="이용약관 및 개인정보 처리방침 전문 보기"
              onPress={handleOpenTermsOfService}
            >
              <Text
                size="sm"
                className="font-semibold text-link-text underline"
              >
                이용약관 및 개인정보 처리방침 전문 보기
              </Text>
            </Pressable>
            <Checkbox
              value="terms-agreed"
              className="min-h-11 w-full items-start"
              isChecked={termsAgreed}
              isDisabled={disabled || hasExistingSession}
              onChange={setTermsAgreed}
              accessibilityLabel="이용약관 및 개인정보 처리방침 필수 동의"
            >
              <CheckboxIndicator className="mt-1 h-6 w-6 rounded-md">
                <CheckboxIcon as={IconCheck} className="h-4 w-4" />
              </CheckboxIndicator>
              <CheckboxLabel className="flex-1 font-normal">
                (필수) 위 내용을 확인했으며 이용약관과 개인정보 처리방침에
                동의합니다.
              </CheckboxLabel>
            </Checkbox>
          </Card>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
