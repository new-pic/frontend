import { colors } from "@shared/constants";
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  Button,
  ButtonIcon,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import {
  IconChevronLeft,
  IconHeartFilled,
  IconShare,
} from "@tabler/icons-react-native";
import { router } from "expo-router";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function FeedDetailPage() {
  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView>
      <VStack className="h-full pt-3 w-full">
        <VStack className="px-6 items-start border-b border-outline-light">
          <Button variant="ghost" size="icon" onPress={handleGoBack}>
            <ButtonIcon as={IconChevronLeft} />
          </Button>
          <HStack space="md" className="items-center px-1 py-2 ">
            <Avatar className="h-8 w-8">
              <AvatarFallbackText>민서1234</AvatarFallbackText>
              <AvatarImage
                source={require("@assets/images/brand-character/hello-newpic.png")}
              />
            </Avatar>
            <Text size="sm" className="font-medium">
              민서1234
            </Text>
          </HStack>
        </VStack>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          }}
          style={{ width: "100%", aspectRatio: 4 / 5 }}
        />
        <HStack className="px-6 py-2 border-t border-b justify-between border-outline-light">
          <HStack className="items-center" space="xs">
            <Button variant="ghost" size="icon" className="w-5 h-5">
              <ButtonIcon
                className="w-5 h-5"
                as={IconHeartFilled}
                color={colors.brand.primary}
                fill={colors.brand.primary}
              />
            </Button>
            <Text className="text-sm font-medium">0개</Text>
          </HStack>
          <Button variant="ghost" size="icon" className="w-5 h-5">
            <ButtonIcon className="w-5 h-5" as={IconShare} />
          </Button>
        </HStack>
        <VStack className="px-6 py-2 ">
          <Text className="text-sm text-link-text mb-1">
            #태그 #태그 #태그 #태그
          </Text>
          <Text className="text-sm whitespace-pre-line">
            {`안녕하세요
제 피드를 봐주셔서 감사합니다
나중에 더 좋은 사진으로 찾아뵐게요!`}
          </Text>
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
