import {
  Box,
  Button,
  ButtonIcon,
  ButtonText,
  Center,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { CaptionContent, ImageSelector } from "@widgets/feed";
import { router } from "expo-router";
import { useState } from "react";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EditStep = "IMAGE" | "CAPTION";

export function FeedEditPage() {
  const [step, setStep] = useState<EditStep>("IMAGE");
  const handleGoBack = () => {
    router.back();
  };

  const handleNextStep = () => {
    setStep("CAPTION");
  };

  const handlePressButton = () => {
    if (step === "IMAGE") {
      handleNextStep();
    } else {
      router.push("/feed");
    }
  };

  return (
    <SafeAreaView>
      <VStack className="h-full pt-3 w-full" space="xl">
        <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
          <Button variant="ghost" size="icon" onPress={handleGoBack}>
            <ButtonIcon as={IconChevronLeft} />
          </Button>
          <Text className="font-semibold" size="lg">
            피드 작성하기
          </Text>
          <Box className="w-10" />
        </HStack>
        <Center>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            }}
            style={{ width: "60%", borderRadius: 20, aspectRatio: 4 / 5 }}
          />
        </Center>
        <VStack className="flex-1">
          {step === "IMAGE" ? (
            <ImageSelector />
          ) : (
            <CaptionContent tags={["여행", "맛집", "추억"]} />
          )}
          <HStack className="px-8 py-4 pt-8 border-t border-outline-light">
            <Button className="flex-1 h-12.5 p-0 rounded-xl" variant="gradient">
              <ButtonText
                size="lg"
                className="font-semibold"
                onPress={handlePressButton}
              >
                {step === "IMAGE" ? "선택하기" : "게시하기"}
              </ButtonText>
            </Button>
          </HStack>
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
