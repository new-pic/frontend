import { userFeedQuery } from "@entities/feed";
import { createFeedDetailHref } from "@features/feed/browse-feed-detail";
import { useAppTranslation } from "@shared/lib";
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
  const { t } = useAppTranslation();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    userFeedQuery.useReadLikedFeeds({ take: 24 });
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
            accessibilityLabel={t("common.accessibility.backToProfile")}
            onPress={handleGoProfile}
          >
            <ButtonIcon as={IconChevronLeft} />
          </Button>
          <Text className="font-semibold" size="lg">
            {t("profile.likedFeeds")}
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
                  source: "liked",
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
