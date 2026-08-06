import { usersQuery } from "@entities/user";
import { createFeedDetailHref } from "@features/feed/browse-feed-detail";
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

export function ProfileMyFeedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    usersQuery.useReadMyFeeds({ take: 24 });
  const feeds = data?.pages.flatMap((page) => page.items) ?? [];
  const feedImages = feeds.map((feed) => ({
    id: feed.id,
    imageUrl: feed.thumbnailUrl,
  }));

  const handleGoProfile = () => {
    router.back();
  };

  const handleEndReached = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  };

  return (
    <SafeAreaView edges={["top"]}>
      <VStack className="h-full pt-4">
        <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel="프로필로 돌아가기"
            onPress={handleGoProfile}
          >
            <ButtonIcon as={IconChevronLeft} />
          </Button>
          <Text className="font-semibold" size="lg">
            내가 올린 피드
          </Text>
          <Box className="w-12" />
        </HStack>
        <VStack className="flex-1">
          <PhotoGrid
            images={feedImages}
            isPending={isPending}
            onEndReached={handleEndReached}
            isFetchingNextPage={isFetchingNextPage}
            onPress={(feed, index) => {
              router.push(
                createFeedDetailHref({
                  feedId: feed.id,
                  index,
                  source: "mine",
                  take: 24,
                }),
              );
            }}
          />
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
