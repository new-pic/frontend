import { feedQuery } from "@entities/feed";
import { FeedDetailPager, FeedDetailSkeleton } from "@widgets/feed/detail";

import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FeedDetailSearchParams extends Record<string, string | string[]> {
  index: string;
  take: string;
  q: string;
  tag: string;
}

export function FeedDetailPage() {
  const { id, index, take, q, tag } = useLocalSearchParams<
    "/feed/[id]",
    FeedDetailSearchParams
  >();
  const FeedSearchParams = { take: take ? Number(take) : undefined, q, tag };

  const {
    data: FeedsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = feedQuery.useReadFeeds(FeedSearchParams);
  const feeds = FeedsData?.pages.flatMap((page) => page.items) ?? [];

  if (isPending) return <FeedDetailSkeleton />;

  if (!feeds || feeds.length === 0) {
    Alert.alert(
      "피드가 존재하지 않습니다.",
      "피드가 삭제되었거나 존재하지 않는 피드입니다.",
      [
        {
          text: "확인",
          onPress: () => {
            router.replace("/feed");
          },
        },
      ],
    );
    return null;
  }

  const initialPageIndex: number | null = useMemo(() => {
    const feedIdx = Number(index ?? 0);
    if (!feeds || feeds.length === 0) return 0;

    if (feeds.length > 0 && feeds[feedIdx]?.id === id) {
      return feedIdx;
    } else {
      return feeds.findIndex((feed) => feed.id === id);
    }
  }, [feeds, id, index]);

  const handleReachLastPage = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <FeedDetailPager
        key={`${id}-${initialPageIndex}`}
        feeds={feeds}
        initialPageIndex={initialPageIndex}
        onReachLastPage={handleReachLastPage}
      />
    </SafeAreaView>
  );
}
