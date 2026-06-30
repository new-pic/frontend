import { useMemo } from "react";
import { Dimensions, FlatList, Image } from "react-native";
import { Pressable } from "../pressable";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface PhotoImages {
  id: string;
  uri: string;
}

export interface PhotoGridProps {
  images: PhotoImages[];
  columns?: number;
  onPress?: () => void;
}

export function PhotoGrid({ images, columns = 3, onPress }: PhotoGridProps) {
  const imageSize = useMemo(() => SCREEN_WIDTH / columns, [columns]);

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.id}
      numColumns={columns}
      renderItem={({ item }) => (
        <Pressable onPress={onPress}>
          <Image
            source={{ uri: item.uri }}
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
