import { TagBadge } from "@entities/tag";
import { useAppTranslation } from "@shared/lib";
import { HStack, Icon, Pressable, Text } from "@shared/ui";
import { IconPlus } from "@tabler/icons-react-native";
import { FlatList } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface TagListProps {
  tags: string[];
  readOnly?: boolean;
  onTagPress?: (tag: string) => void;
  onPressAddTag?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function TagList({
  tags,
  readOnly = true,
  onTagPress,
  onPressAddTag,
  contentContainerStyle,
}: TagListProps) {
  const { t } = useAppTranslation();
  return (
    <FlatList
      horizontal
      data={tags}
      keyExtractor={(tag) => tag}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[{ gap: 4 }, contentContainerStyle]}
      renderItem={({ item }) => (
        <TagBadge
          tag={item}
          removable={!readOnly}
          onPress={() => onTagPress?.(item)}
        />
      )}
      ListFooterComponent={
        onPressAddTag ? (
          <Pressable onPress={onPressAddTag}>
            <HStack className="h-8 px-3 items-center gap-1 rounded-full border border-outline-light">
              <Icon as={IconPlus} size="sm" />
              <Text size="sm">{t("feed.tags.select")}</Text>
            </HStack>
          </Pressable>
        ) : null
      }
    />
  );
}
