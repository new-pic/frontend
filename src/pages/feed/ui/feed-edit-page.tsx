import {
  Box,
  Button,
  ButtonIcon,
  Center,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { ImageSelector } from "@widgets/feed";
import { router } from "expo-router";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function FeedEditPage() {
  const handleGoBack = () => {
    router.back();
  };
  return (
    <SafeAreaView edges={["top"]}>
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
            style={{ width: "80%", borderRadius: 20, aspectRatio: 4 / 5 }}
          />
        </Center>
        <ImageSelector />
      </VStack>
    </SafeAreaView>
  );
}
