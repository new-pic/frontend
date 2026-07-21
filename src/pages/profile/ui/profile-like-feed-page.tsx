import { usersQuery } from "@entities/user";
import {
  Box,
  Button,
  ButtonIcon,
  HStack,
  PhotoGrid,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export function ProfileLikeFeedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usersQuery.useReadLikedFeeds({ take: 24 });
  const feeds = data?.pages.flatMap((page) => page.items) ?? [];
  const feedImages = feeds.map((feed) => ({
    id: feed.id,
    imageUrl: feed.thumbnailUrl,
  }));

  const handleGoProfile = () => {
    router.replace("/profile");
  };

  const handleEndReached = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  };

  return (
    <SafeAreaView edges={["top"]}>
      <VStack className="h-full pt-4">
        <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
          <Button variant="ghost" size="icon" onPress={handleGoProfile}>
            <ButtonIcon as={IconChevronLeft} />
          </Button>
          <Text className="font-semibold" size="lg">
            찜한 피드
          </Text>
          <Box className="w-10" />
        </HStack>
        <VStack className="flex-1">
          <PhotoGrid
            images={feedImages}
            onEndReached={handleEndReached}
            isFetchingNextPage={isFetchingNextPage}
          />
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
