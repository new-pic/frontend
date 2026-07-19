import AppleLogo from "@assets/icons/apple-logo.svg";
import GoogleLogo from "@assets/icons/google-logo.svg";
import { useSocialLogin } from "@features/user/save-social-login";
import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { router } from "expo-router";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function WelcomPage() {
  const { isLoading, loginWithGoogle, loginToGuest } = useSocialLogin();

  const handleGuestLogin = () => {
    router.replace("/feed");
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
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

          <Text>이제 그만 사진으로 핍박 받자. 우리도 인간이다.</Text>
          <Text>사진을 못찍는 친구들이 사람 취급을 받는</Text>
          <Text>그날 까지..... free</Text>
        </Center>
        <VStack space="lg">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={isLoading}
            onPress={handleGoogleLogin}
          >
            <GoogleLogo width={24} height={24} />
            <ButtonText>구글로 시작하기</ButtonText>
          </Button>
          <Button
            variant="outline"
            className="rounded-full bg-black"
            disabled={isLoading}
          >
            <AppleLogo width={24} height={24} />
            <ButtonText className="text-white">애플로 시작하기</ButtonText>
          </Button>
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
