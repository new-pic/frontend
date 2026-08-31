import {
  findFeedDetailInitialIndex,
  parseFeedDetailSource,
  useFeedDetailCollection,
} from "@features/feed/browse-feed-detail";
import { getFirstSearchParam } from "@shared/lib";
import { Button, ButtonText, Center, Text } from "@shared/ui";
import { FeedDetailPager, FeedDetailSkeleton } from "@widgets/feed/detail";

import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

interface FeedDetailSearchParams extends Record<string, string | string[]> {
  index: string;
  take: string;
  q: string;
  tag: string;
  source: string;
}

export function FeedDetailPage() {
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
  const parsedTake = Number(take ?? 24);
  const feedSearchParams = {
    take: Number.isFinite(parsedTake) ? parsedTake : 24,
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
            잘못된 피드 목록 경로입니다.
          </Text>
          <Button variant="outline" onPress={() => router.back()}>
            <ButtonText>돌아가기</ButtonText>
          </Button>
        </Center>
      </SafeAreaView>
    );
  }

  if (isPending) return <FeedDetailSkeleton />;

  if (isError || feeds.length === 0) {
    const message = isError
      ? "피드 목록을 불러오지 못했습니다."
      : "피드가 삭제되었거나 존재하지 않습니다.";

    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <Center className="flex-1 gap-4 px-6">
          <Text className="text-center text-label-muted">{message}</Text>
          {isError ? (
            <Button variant="outline" onPress={() => void refetch()}>
              <ButtonText>다시 시도</ButtonText>
            </Button>
          ) : (
            <Button variant="outline" onPress={() => router.back()}>
              <ButtonText>돌아가기</ButtonText>
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
