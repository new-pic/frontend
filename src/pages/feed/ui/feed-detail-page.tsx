import { feedQuery } from "@entities/feed";
import { FeedDetailPager } from "@widgets/feed/detail";

import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
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

  if (isPending || feeds.length === 0) return null;

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
