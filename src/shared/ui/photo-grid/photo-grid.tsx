import { FeedResponse } from "@entities/feed";
import { useMemo } from "react";
import { Dimensions, FlatList, Image } from "react-native";
import { Pressable } from "../pressable";

const SCREEN_WIDTH = Dimensions.get("window").width;

export interface PhotoGridProps {
  images: FeedResponse[];
  columns?: number;
  onPress?: (feedId: string) => void;
}

export function PhotoGrid({ images, columns = 3, onPress }: PhotoGridProps) {
  const imageSize = useMemo(() => SCREEN_WIDTH / columns, [columns]);

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.id}
      numColumns={columns}
      renderItem={({ item }) => (
        <Pressable onPress={() => onPress?.(item.id)}>
          <Image
            source={{ uri: item.imageUrl }}
            style={{
              width: imageSize,
              aspectRatio: 4 / 5,
            }}
          />
        </Pressable>
      )}
    />
  );
}
