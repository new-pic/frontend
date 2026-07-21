import { feedQuery } from "@entities/feed";
import { colors } from "@shared/constants";
import { useDebouncedValue } from "@shared/hooks";
import {
  Badge,
  BadgeIcon,
  BadgeText,
  BottomSheetModal,
  Button,
  ButtonText,
  HStack,
  Icon,
  Input,
  InputField,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { IconCheck, IconX } from "@tabler/icons-react-native";
import { useEffect, useState } from "react";
import { FlatList } from "react-native";

interface TagBottomSheetProps {
  isOpen: boolean;
  selectedTags?: string[];
  onSelectTag?: (tag: string[]) => void;
  onClose: () => void;
}

export function TagBottomSheet({
  isOpen,
  selectedTags,
  onSelectTag,
  onClose,
}: TagBottomSheetProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const { data } = feedQuery.useReadTags({ keyword: debouncedSearchQuery });
  const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(
    selectedTags || [],
  );

  useEffect(() => {
    if (!isOpen) return;

    setLocalSelectedTags(selectedTags || []);
    setSearchQuery("");
  }, [isOpen, selectedTags]);

  const handleTagPress = (tag: string) => {
    setLocalSelectedTags((previousTags) => {
      const nextTags = new Set(previousTags);

      if (nextTags.has(tag)) {
        nextTags.delete(tag);
      } else if (nextTags.size < 3) {
        nextTags.add(tag);
      }

      return [...nextTags];
    });
  };

  return (
    <BottomSheetModal open={isOpen} onClose={onClose} snapPoints={["100%"]}>
      <VStack style={{ flex: 1, minHeight: 0 }}>
        <VStack className="px-6 pt-3" space="xl">
          <HStack className="justify-center">
            <Text className="font-semibold text-lg">해시태그 검색</Text>
          </HStack>
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
          data={data}
          extraData={localSelectedTags}
          nestedScrollEnabled
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
          }}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <Pressable
              disabled={
                !localSelectedTags.includes(item.label) &&
                localSelectedTags.length >= 3
              }
              onPress={() => {
                handleTagPress(item.label);
              }}
            >
              <HStack className="px-2 py-3 items-center justify-between">
                <Text className="font-medium"># {item.label}</Text>
                {localSelectedTags?.includes(item.label) && (
                  <Icon as={IconCheck} color={colors.brand.primary} />
                )}
              </HStack>
            </Pressable>
          )}
        />
        <HStack className="border-t border-outline-light">
          <VStack className="flex-1 px-8 py-4" space="md">
            <HStack className="items-center justify-between">
              <Text className="font-semibold">선택한 해시태그</Text>
            </HStack>
            <HStack className="gap-1">
              {localSelectedTags?.map((tag) => (
                <Pressable onPress={() => handleTagPress(tag)} key={tag}>
                  <Badge>
                    <BadgeText>{tag}</BadgeText>
                    <BadgeIcon as={IconX} color="white" />
                  </Badge>
                </Pressable>
              ))}
            </HStack>
          </VStack>
        </HStack>
        <HStack className="px-8 py-4 gap-2">
          <Button className="flex-1 h-10" variant="outline" onPress={onClose}>
            <ButtonText>취소하기</ButtonText>
          </Button>
          <Button
            className="flex-1 h-10"
            variant="gradient"
            onPress={() => {
              onSelectTag?.(localSelectedTags);
              onClose();
            }}
          >
            <ButtonText>완료하기</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </BottomSheetModal>
  );
}
