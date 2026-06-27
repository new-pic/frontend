import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function NotFoundPage() {
  return (
    <SafeAreaView>
      <VStack className="h-full px-8">
        <Center className="flex-1 mb-10">
          <Image
            source={require("@assets/images/brand-character/404_newpic.png")}
            alt="404"
            className="w-full h-70"
            resizeMode="contain"
          />
          <VStack space="sm">
            <Text size="xl">잘못된 접근입니다.</Text>
            <Text>홈 화면으로 이동하시겠습니까?</Text>
          </VStack>
        </Center>
        <Button variant="outline" size="lg">
          <ButtonText>홈으로 이동하기</ButtonText>
        </Button>
      </VStack>
    </SafeAreaView>
  );
}
