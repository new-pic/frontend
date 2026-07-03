// 실시간 공유 승인 대기 화면

import { Box, Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function SharingWaitingPage() {
  return (
    <SafeAreaView>
      <VStack className="h-full">
        <Center className="flex-1 mb-10">
          <VStack space="4xl" className="items-center">
            <Image
              source={require("@assets/images/icon.png")}
              alt="404"
              className="w-40 h-40"
              resizeMode="contain"
            />
            <VStack space="sm" className="items-center">
              <Text size="xl">닉네임님이 승인대기 중 입니다.</Text>
              <Text className="text-outline">잠시만 기다려주세요</Text>
            </VStack>
            <Button variant="outline" size="lg">
              <ButtonText>취소하기</ButtonText>
            </Button>
          </VStack>
        </Center>
        <Box className="absolute bottom-0 h-20 bg-outline-light w-full" />
      </VStack>
    </SafeAreaView>
  );
}
