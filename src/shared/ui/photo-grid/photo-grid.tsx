import { colors } from "@shared/constants";
import { IconCircleCheck } from "@tabler/icons-react-native";
import { useMemo } from "react";
import { ActivityIndicator, Dimensions, FlatList, Image } from "react-native";
import { Center } from "../center";
import { Fab, FabIcon } from "../fab";
import { Pressable } from "../pressable";
import { Text } from "../text";

const SCREEN_WIDTH = Dimensions.get("window").width;

export interface PhotoGridImage {
  id: string;
  imageUrl: string;
}

export interface PhotoGridProps<T extends PhotoGridImage = PhotoGridImage> {
  images: T[];
  selectedImages?: Array<{ id: string }>;
  columns?: number;
  onPress?: (image: T) => void;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
}

export function PhotoGrid<T extends PhotoGridImage>({
  images,
  selectedImages,
  columns = 3,
  onPress,
  onEndReached,
  isFetchingNextPage = false,
}: PhotoGridProps<T>) {
  const imageSize = useMemo(() => SCREEN_WIDTH / columns, [columns]);

  if (!images || images.length === 0) {
    return (
      <Center className="flex-1 ">
        <Text className="text-label-muted">이미지가 존재하지 않습니다...</Text>
      </Center>
    );
  }

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.id}
      numColumns={columns}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <Center className="py-4">
            <ActivityIndicator color={colors.brand.primary} />
          </Center>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => onPress?.(item)}>
          <Image
            source={{ uri: item.imageUrl }}
            style={{
              width: imageSize,
              aspectRatio: 4 / 5,
            }}
          />
          {selectedImages?.some((selected) => selected.id === item.id) && (
            <Fab className="p-0 h-6 top-1 right-1">
              <FabIcon
                className="w-6 h-6"
                as={IconCircleCheck}
                fill={colors.brand.primary}
                color="white"
              />
            </Fab>
          )}
        </Pressable>
      )}
    />
  );
}
