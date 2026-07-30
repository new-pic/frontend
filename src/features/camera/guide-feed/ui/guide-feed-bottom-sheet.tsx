import { usersQuery } from "@entities/user";
import {
  BottomSheetModal,
  Button,
  ButtonText,
  Center,
  HStack,
  PhotoGrid,
  Text,
  VStack,
} from "@shared/ui";
import { View } from "react-native";

const GUIDE_SHEET_SNAP_POINTS = ["70%", "100%"];

interface GuideFeedBottomSheetProps {
  open: boolean;
  selectedFeedId?: string;
  onOpenDetail: (feedId: string, index: number) => void;
  onClear: () => void;
  onClose: () => void;
}

export function GuideFeedBottomSheet({
  open,
  selectedFeedId,
  onOpenDetail,
  onClear,
  onClose,
}: GuideFeedBottomSheetProps) {
  const savedFeedsQuery = usersQuery.useReadSavedFeeds(
    { take: 24 },
    { enabled: open },
  );
  const feeds =
    savedFeedsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const gridItems = feeds.map((feed) => ({
    id: feed.id,
    imageUrl: feed.thumbnailUrl,
    thumbnailUrl: feed.thumbnailUrl,
    detailImageUrl: feed.detailImageUrl,
  }));

  const handleEndReached = () => {
    if (
      !savedFeedsQuery.hasNextPage ||
      savedFeedsQuery.isFetchingNextPage
    ) {
      return;
    }
    void savedFeedsQuery.fetchNextPage();
  };

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      snapPoints={GUIDE_SHEET_SNAP_POINTS}
    >
      <View
        collapsable={false}
        style={{ flexGrow: 1, height: 0, overflow: "hidden" }}
      >
        <HStack className="items-center justify-between px-6 pb-4 pt-3">
          <Text className="font-semibold text-lg">저장한 피드</Text>
          {selectedFeedId ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                onClear();
                onClose();
              }}
            >
              <ButtonText>가이드 해제</ButtonText>
            </Button>
          ) : null}
        </HStack>

        <VStack className="flex-1">
          {savedFeedsQuery.isError ? (
            <Center className="flex-1 gap-3 px-6">
              <Text className="text-center text-label-muted">
                저장한 피드를 불러오지 못했습니다.
              </Text>
              <Button
                variant="outline"
                onPress={() => void savedFeedsQuery.refetch()}
              >
                <ButtonText>다시 시도</ButtonText>
              </Button>
            </Center>
          ) : (
            <PhotoGrid
              images={gridItems}
              selectedImages={
                selectedFeedId ? [{ id: selectedFeedId }] : undefined
              }
              isPending={savedFeedsQuery.isPending}
              isFetchingNextPage={
                savedFeedsQuery.isFetchingNextPage
              }
              onEndReached={handleEndReached}
              onPress={(feed, index) =>
                onOpenDetail(feed.id, index)
              }
            />
          )}
        </VStack>
      </View>
    </BottomSheetModal>
  );
}
