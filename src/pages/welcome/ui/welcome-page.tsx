import AppleLogo from "@assets/icons/apple-logo.svg";
import GoogleLogo from "@assets/icons/google-logo.svg";
import { useSocialLogin } from "@features/user/save-social-login";
import { EXTERNAL_LINKS } from "@shared/config";
import { useAppTranslation } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import {
  Button,
  ButtonSpinner,
  ButtonText,
  BottomSheetModal,
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
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export function WelcomPage() {
  const { t } = useAppTranslation();
  const { disabled, appleLogin, googleLogin, guestLogin } = useSocialLogin();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isTermsSheetOpen, setIsTermsSheetOpen] = useState(false);
  const [draftTermsAgreed, setDraftTermsAgreed] = useState(false);
  const insets = useSafeAreaInsets();
  const termsAgreed = useAuthStore((state) => state.termsAgreed);
  const hasExistingSession = useAuthStore((state) =>
    Boolean(state.accessToken),
  );
  const setTermsAgreed = useAuthStore((state) => state.setTermsAgreed);

  useEffect(() => {
    if (!hasExistingSession && !termsAgreed) {
      setIsTermsSheetOpen(true);
    }
  }, [hasExistingSession, termsAgreed]);

  const openTermsSheet = () => {
    setDraftTermsAgreed(termsAgreed);
    setIsTermsSheetOpen(true);
  };

  const closeTermsSheet = () => {
    setDraftTermsAgreed(termsAgreed);
    setIsTermsSheetOpen(false);
  };

  const handleAcceptTerms = () => {
    if (!draftTermsAgreed) return;

    setTermsAgreed(true);
    setIsTermsSheetOpen(false);
  };

  const ensureTermsAgreed = () => {
    if (termsAgreed) return true;

    openTermsSheet();
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
      errorMessage: t("welcome.guestLoginFailed"),
    });
  };

  const handleGoogleLogin = () => {
    return handleLogin({
      loginFn: googleLogin.login,
      errorMessage: t("welcome.accountLinkFailed"),
    });
  };

  const handleAppleLogin = () => {
    return handleLogin({
      loginFn: appleLogin.login,
      errorMessage: t("welcome.accountLinkFailed"),
    });
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(EXTERNAL_LINKS.TERMS_OF_SERVICE);
    } catch {
      Alert.alert(
        t("common.errors.pageLinkTitle"),
        t("welcome.termsOpenFailed"),
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
              alt={t("welcome.imageAccessibility")}
              className="w-full h-70"
              resizeMode="contain"
            />

            <Text>{t("welcome.taglineFirst")}</Text>
            <Text>{t("welcome.taglineSecond")}</Text>
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
              <ButtonText>{t("welcome.startWithGoogle")}</ButtonText>
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
                      {t("welcome.startWithApple")}
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
              <ButtonText>{t("welcome.continueAsGuest")}</ButtonText>
            </Button>
          </VStack>
        </VStack>

        <Pressable
          className="min-h-11 items-center justify-center"
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t("welcome.viewTerms")}
          onPress={openTermsSheet}
        >
          <Text size="sm" className="text-label-muted underline">
            {t("welcome.viewTerms")}
          </Text>
        </Pressable>
      </ScrollView>

      <BottomSheetModal
        open={isTermsSheetOpen}
        onClose={closeTermsSheet}
        snapPoints={["75%", "100%"]}
      >
        <ScrollView
          style={{ flex: 1 }}
          nestedScrollEnabled
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: Math.max(24, insets.bottom),
            gap: 24,
          }}
        >
          <VStack space="xs">
            <Text size="xl" className="font-bold">
              {t("welcome.termsTitle")}
            </Text>
            <Text className="text-label-muted">{t("welcome.termsIntro")}</Text>
          </VStack>

          <Card size="sm" className="gap-3 border-outline shadow-none">
            <Text size="sm" className="font-semibold">
              {t("welcome.dataTitle")}
            </Text>
            <VStack className="gap-1">
              <Text size="xs">{t("welcome.dataAccount")}</Text>
              <Text size="xs">{t("welcome.dataContent")}</Text>
              <Text size="xs">{t("welcome.dataPolicy")}</Text>
            </VStack>
            <Pressable
              className="min-h-11 self-start justify-center"
              disabled={disabled}
              accessibilityRole="link"
              accessibilityLabel={t("welcome.viewFullTerms")}
              onPress={handleOpenTermsOfService}
            >
              <Text
                size="sm"
                className="font-semibold text-link-text underline"
              >
                {t("welcome.viewFullTerms")}
              </Text>
            </Pressable>
            <Checkbox
              value="terms-agreed"
              className="min-h-11 w-full items-start"
              isChecked={draftTermsAgreed}
              isDisabled={disabled || hasExistingSession}
              onChange={setDraftTermsAgreed}
              accessibilityLabel={t("welcome.requiredConsentLabel")}
            >
              <CheckboxIndicator className="mt-1 h-6 w-6 rounded-md">
                <CheckboxIcon as={IconCheck} className="h-4 w-4" />
              </CheckboxIndicator>
              <CheckboxLabel className="flex-1 font-normal">
                {t("welcome.requiredConsent")}
              </CheckboxLabel>
            </Checkbox>
          </Card>

          <Button
            variant="gradient"
            className="w-full h-12.5 p-0 rounded-xl"
            disabled={!draftTermsAgreed || disabled || hasExistingSession}
            onPress={handleAcceptTerms}
          >
            <ButtonText size="lg" className="font-semibold">
              {t("welcome.acceptAndContinue")}
            </ButtonText>
          </Button>
        </ScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
