import { TagBadge } from "@entities/tags";
import { HStack, Icon, Pressable, Text } from "@shared/ui";
import { IconPlus } from "@tabler/icons-react-native";
import { FlatList } from "react-native";

interface TagListProps {
  tags: string[];
  readOnly?: boolean;
  onTagPress?: (tag: string) => void;
  onPressAddTag?: () => void;
}

export function TagList({
  tags,
  readOnly = true,
  onTagPress,
  onPressAddTag,
}: TagListProps) {
  return (
    <FlatList
      horizontal
      data={tags}
      keyExtractor={(tag) => tag}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 4,
      }}
      renderItem={({ item }) => (
        <TagBadge
          tag={item}
          removable={!readOnly}
          onPress={() => onTagPress?.(item)}
        />
      )}
      ListFooterComponent={
        onPressAddTag && !readOnly ? (
          <Pressable onPress={onPressAddTag}>
            <HStack className="h-8 px-3 items-center gap-1 rounded-full border border-outline-light">
              <Icon as={IconPlus} size="sm" />
              <Text size="sm">태그 선택</Text>
            </HStack>
          </Pressable>
        ) : null
      }
    />
  );
}
