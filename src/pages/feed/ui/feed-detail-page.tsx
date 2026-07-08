import { feedQuery } from "@entities/feed";
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
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function FeedDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data } = feedQuery.useReadFeed(id);

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
              <AvatarFallbackText>{data?.author.nickname}</AvatarFallbackText>
              <AvatarImage source={{ uri: data?.author.profileImage }} />
            </Avatar>
            <Text size="sm" className="font-medium">
              {data?.author.nickname}
            </Text>
          </HStack>
        </VStack>
        <Image
          source={{
            uri: data?.imageUrl,
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
            <Text className="text-sm font-medium">
              {data?.likeCount ?? 0}개
            </Text>
          </HStack>
          <Button variant="ghost" size="icon" className="w-5 h-5">
            <ButtonIcon className="w-5 h-5" as={IconShare} />
          </Button>
        </HStack>
        <VStack className="px-6 py-2 ">
          <Text className="text-sm text-link-text mb-1">
            {data?.tags.map((tag) => `#${tag} `).join(" ")}
          </Text>
          <Text className="text-sm whitespace-pre-line">
            {data?.description}
          </Text>
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
