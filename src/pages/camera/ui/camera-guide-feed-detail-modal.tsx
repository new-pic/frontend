import type { FeedResponse } from "@entities/feed";
import {
  findFeedDetailInitialIndex,
  useFeedDetailCollection,
} from "@features/feed/browse-feed-detail";
import {
  Button,
  ButtonText,
  Center,
  Text,
} from "@shared/ui";
import {
  FeedDetailPager,
  FeedDetailSkeleton,
} from "@widgets/feed/detail";
import { Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface CameraGuideFeedDetailModalProps {
  feedId?: string;
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  onSelect: (feed: FeedResponse) => void;
}

export function CameraGuideFeedDetailModal({
  feedId,
  initialIndex,
  open,
  onClose,
  onSelect,
}: CameraGuideFeedDetailModalProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useFeedDetailCollection({
    source: "saved",
    params: { take: 24 },
    enabled: open,
  });
  const feeds = data?.pages.flatMap((page) => page.items) ?? [];
  const initialPageIndex = findFeedDetailInitialIndex(
    feeds,
    feedId ?? "",
    initialIndex,
  );

  const handleReachLastPage = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={open}
      onRequestClose={onClose}
    >
      {isPending ? (
        <FeedDetailSkeleton />
      ) : isError || feeds.length === 0 ? (
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <Center className="flex-1 gap-4 px-6">
            <Text className="text-center text-label-muted">
              {isError
                ? "저장한 피드를 불러오지 못했습니다."
                : "피드가 삭제되었거나 존재하지 않습니다."}
            </Text>
            {isError ? (
              <Button
                variant="outline"
                onPress={() => void refetch()}
              >
                <ButtonText>다시 시도</ButtonText>
              </Button>
            ) : null}
            <Button variant="ghost" onPress={onClose}>
              <ButtonText>목록으로 돌아가기</ButtonText>
            </Button>
          </Center>
        </SafeAreaView>
      ) : (
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <FeedDetailPager
            key={`${feedId}-${initialPageIndex}`}
            feeds={feeds}
            initialPageIndex={initialPageIndex}
            onBack={onClose}
            onGuidePress={onSelect}
            onReachLastPage={handleReachLastPage}
          />
        </SafeAreaView>
      )}
    </Modal>
  );
}
