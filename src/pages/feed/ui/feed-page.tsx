import { feedQuery } from "@entities/feed";
import { gradients } from "@shared/constants";
import { useDebouncedValue } from "@shared/hooks";
import { TagBottomSheet } from "@widgets/feed/tags";

import {
  Badge,
  BadgeText,
  Fab,
  HStack,
  Icon,
  Input,
  InputField,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { PhotoGrid } from "@shared/ui/photo-grid";
import { IconPencil, IconPlus } from "@tabler/icons-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function FeedPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagBottomSheetOpen, setIsTagBottomSheetOpen] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 400);

  const { data } = feedQuery.useReadFeeds({
    take: 20,
    q: debouncedSearchQuery || undefined,
    tag: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
  });
  const handlePressFeed = async (feedId: string) => {
    router.push(`/feed/${feedId}`);
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
            <FlatList
              horizontal
              data={selectedTags}
              keyExtractor={(tag) => tag}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
              renderItem={({ item }) => (
                <Badge>
                  <BadgeText># {item}</BadgeText>
                </Badge>
              )}
              ListFooterComponent={
                <Pressable onPress={handleOpenTagBottomSheet}>
                  <HStack className="h-8 px-3 items-center gap-1 rounded-full border border-outline-light">
                    <Icon as={IconPlus} size="sm" />
                    <Text size="sm">태그 선택</Text>
                  </HStack>
                </Pressable>
              }
            />
          </VStack>
          <PhotoGrid
            images={data?.items || []}
            onPress={(feed) => handlePressFeed(feed.id)}
          />
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
