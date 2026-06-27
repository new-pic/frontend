import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function WelcomPage() {
  return (
    <SafeAreaView>
      <VStack className="h-full px-8">
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
        <VStack space="md">
          <Button variant="outline" className="rounded-full">
            <ButtonText>구글로 시작하기</ButtonText>
          </Button>
          <Button variant="outline" className="rounded-full">
            <ButtonText>애플로 시작하기</ButtonText>
          </Button>
          <Button variant="ghost">
            <ButtonText>로그인 없이 사용하기</ButtonText>
          </Button>
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
