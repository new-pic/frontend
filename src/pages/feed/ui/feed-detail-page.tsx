import {
  findFeedDetailInitialIndex,
  parseFeedDetailSource,
  useFeedDetailCollection,
} from "@features/feed/browse-feed-detail";
import { getFirstSearchParam, useAppTranslation } from "@shared/lib";
import { Button, ButtonText, Center, Text } from "@shared/ui";
import { FeedDetailPager, FeedDetailSkeleton } from "@widgets/feed/detail";

import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FEED_LIST_PAGE_SIZE } from "../model";

interface FeedDetailSearchParams extends Record<string, string | string[]> {
  index: string;
  take: string;
  q: string;
  tag: string;
  source: string;
}

export function FeedDetailPage() {
  const { t } = useAppTranslation();
  const {
    id,
    index,
    take,
    q,
    tag,
    source: sourceParam,
  } = useLocalSearchParams<"/feed/[id]", FeedDetailSearchParams>();
  const feedId = getFirstSearchParam(id) ?? "";
  const source = parseFeedDetailSource(sourceParam);
  const parsedTake = Number(take ?? FEED_LIST_PAGE_SIZE);
  const feedSearchParams = {
    take: Number.isFinite(parsedTake) ? parsedTake : FEED_LIST_PAGE_SIZE,
    q,
    tag,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useFeedDetailCollection({
    source: source ?? "public",
    params: feedSearchParams,
    enabled: source !== null,
  });
  const feeds = data?.pages.flatMap((page) => page.items) ?? [];
  const initialPageIndex = findFeedDetailInitialIndex(
    feeds,
    feedId,
    Number(index ?? 0),
  );

  if (source === null) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <Center className="flex-1 gap-4 px-6">
          <Text className="text-center text-label-muted">
            {t("feed.invalidListPath")}
          </Text>
          <Button variant="outline" onPress={() => router.back()}>
            <ButtonText>{t("common.actions.back")}</ButtonText>
          </Button>
        </Center>
      </SafeAreaView>
    );
  }

  if (isPending) return <FeedDetailSkeleton />;

  if (isError || feeds.length === 0) {
    const message = isError ? t("feed.listLoadFailed") : t("feed.missing");

    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <Center className="flex-1 gap-4 px-6">
          <Text className="text-center text-label-muted">{message}</Text>
          {isError ? (
            <Button variant="outline" onPress={() => void refetch()}>
              <ButtonText>{t("common.actions.retry")}</ButtonText>
            </Button>
          ) : (
            <Button variant="outline" onPress={() => router.back()}>
              <ButtonText>{t("common.actions.back")}</ButtonText>
            </Button>
          )}
        </Center>
      </SafeAreaView>
    );
  }

  const handleReachLastPage = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <FeedDetailPager
        key={`${feedId}-${initialPageIndex}`}
        feeds={feeds}
        initialPageIndex={initialPageIndex}
        onReachLastPage={handleReachLastPage}
      />
    </SafeAreaView>
  );
}
