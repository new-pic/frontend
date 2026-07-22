import { feedQuery } from "@entities/feed";
import { TagBottomSheet, TagList } from "@features/tags/select-feed-tags";
import { gradients } from "@shared/constants";
import { useDebouncedValue } from "@shared/hooks";
import { useAuthStore } from "@shared/model";

import { Fab, Input, InputField, Text, VStack } from "@shared/ui";
import { PhotoGrid } from "@shared/ui/photo-grid";
import { IconPencil } from "@tabler/icons-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export function FeedPage() {
  const isGuest = useAuthStore((state) => state.isGuest);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagBottomSheetOpen, setIsTagBottomSheetOpen] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 400);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    feedQuery.useReadFeeds({
      take: 24,
      q: debouncedSearchQuery || undefined,
      tag: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
    });
  const feeds = data?.pages.flatMap((page) => page.items) ?? [];
  const feedImages = feeds.map((feed) => ({
    id: feed.id,
    imageUrl: feed.thumbnailUrl,
  }));
  const handlePressFeed = async (feedId: string, index: number) => {
    router.push({
      pathname: `/feed/[id]`,
      params: {
        id: feedId,
        index: String(index),
        take: String(24),
        q: debouncedSearchQuery || undefined,
        tag: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
      },
    });
  };

  const handlePressEdit = async () => {
    router.push("/feed/edit");
  };

  const handleOpenTagBottomSheet = () => {
    setIsTagBottomSheetOpen(true);
  };

  const handleCloseTagBottomSheet = () => {
    setIsTagBottomSheetOpen(false);
  };

  const handleSelectTags = (tags: string[]) => {
    setSelectedTags(tags);
  };

  const handleTagPress = (tag: string) => {
    setSelectedTags((previousTags) => {
      const nextTags = new Set(previousTags);

      if (nextTags.has(tag)) {
        nextTags.delete(tag);
      } else {
        nextTags.add(tag);
      }

      return [...nextTags];
    });
  };

  const handleEndReached = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  };

  return (
    <>
      <SafeAreaView edges={["top"]}>
        <VStack className="h-full pt-4">
          <VStack className="mb-2">
            <VStack className="px-6">
              <Text className="font-semibold mb-2" size="xl">
                피드
              </Text>
              <Input>
                <InputField
                  placeholder="검색어를 입력해주세요."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
              </Input>
            </VStack>
            <TagList
              tags={selectedTags}
              readOnly={false}
              onTagPress={handleTagPress}
            />
          </VStack>
          <PhotoGrid
            images={feedImages}
            onPress={(feed, index) => handlePressFeed(feed.id, index)}
            onEndReached={handleEndReached}
            isFetchingNextPage={isFetchingNextPage}
          />
          {!isGuest ? (
            <Fab
              className="w-15 h-15 rounded-full bottom-8 right-8"
              onPress={handlePressEdit}
            >
              <LinearGradient
                {...gradients.primary}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconPencil size={36} color="white" />
              </LinearGradient>
            </Fab>
          ) : null}
        </VStack>
      </SafeAreaView>
      <TagBottomSheet
        isOpen={isTagBottomSheetOpen}
        selectedTags={selectedTags}
        onSelectTag={handleSelectTags}
        onClose={handleCloseTagBottomSheet}
      />
    </>
  );
}
