import { userFeedQuery } from "@entities/feed";
import { useAppTranslation } from "@shared/lib";
import { adaptFeedToGuideSelection } from "../lib/feed-guide-selection-adapter";
import type { GuideFeedSelection } from "../model";
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
  onSelect: (selection: GuideFeedSelection) => void;
  onClear: () => void;
  onClose: () => void;
}

export function GuideFeedBottomSheet({
  open,
  selectedFeedId,
  onSelect,
  onClear,
  onClose,
}: GuideFeedBottomSheetProps) {
  const { t } = useAppTranslation();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = userFeedQuery.useReadSavedFeeds({ take: 24 }, { enabled: open });
  const feeds = data?.pages.flatMap((page) => page.items) ?? [];
  const gridItems = feeds.map((feed) => ({
    id: feed.id,
    imageUrl: feed.thumbnailUrl,
    thumbnailUrl: feed.thumbnailUrl,
    detailImageUrl: feed.detailImageUrl,
  }));

  const handleEndReached = () => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }
    void fetchNextPage();
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
          <Text className="font-paperlogy-semibold text-lg">
            {t("guide.savedFeeds")}
          </Text>
          {selectedFeedId ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                onClear();
                onClose();
              }}
            >
              <ButtonText>{t("guide.clear")}</ButtonText>
            </Button>
          ) : null}
        </HStack>

        <VStack className="flex-1">
          {isError ? (
            <Center className="flex-1 gap-3 px-6">
              <Text className="text-center text-label-muted">
                {t("guide.savedFeedsLoadFailed")}
              </Text>
              <Button variant="outline" onPress={() => void refetch()}>
                <ButtonText>{t("common.actions.retry")}</ButtonText>
              </Button>
            </Center>
          ) : (
            <PhotoGrid
              images={gridItems}
              selectedImages={
                selectedFeedId ? [{ id: selectedFeedId }] : undefined
              }
              isPending={isPending}
              isFetchingNextPage={isFetchingNextPage}
              onEndReached={handleEndReached}
              onPress={(feed) => {
                onSelect(adaptFeedToGuideSelection(feed));
                onClose();
              }}
            />
          )}
        </VStack>
      </View>
    </BottomSheetModal>
  );
}
