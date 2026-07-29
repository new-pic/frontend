import { colors } from "@shared/constants";
import { IconCircleCheck } from "@tabler/icons-react-native";
import { useMemo } from "react";
import { ActivityIndicator, Dimensions, FlatList, Image } from "react-native";
import { Box } from "../box";
import { Center } from "../center";
import { Fab, FabIcon } from "../fab";
import { Pressable } from "../pressable";
import { Skeleton } from "../skeleton";
import { Text } from "../text";

const SCREEN_WIDTH = Dimensions.get("window").width;

export interface PhotoGridImage {
  id: string;
  imageUrl: string;
}

function PhotoGridSkeleton({ columns = 3 }: { columns?: number }) {
  const imageSize = useMemo(() => SCREEN_WIDTH / columns, [columns]);
  const skeletonItems = Array.from({ length: 20 }, (_, index) => index);

  return (
    <FlatList
      data={skeletonItems}
      keyExtractor={(item) => item.toString()}
      numColumns={columns}
      style={{ gap: 4 }}
      renderItem={() => (
        <Box
          style={{
            flex: 1,
            width: imageSize,
            aspectRatio: 4 / 5,
          }}
        >
          <Skeleton variant="sharp" />
        </Box>
      )}
    />
  );
}

export interface PhotoGridProps<T extends PhotoGridImage = PhotoGridImage> {
  images: T[];
  selectedImages?: Array<{ id: string }>;
  columns?: number;
  onPress?: (image: T, index: number) => void;
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  isPending?: boolean;
  isFetchingNextPage?: boolean;
}

export function PhotoGrid<T extends PhotoGridImage>({
  images,
  selectedImages,
  columns = 3,
  onPress,
  onEndReached,
  onRefresh,
  refreshing = false,
  isPending = false,
  isFetchingNextPage = false,
}: PhotoGridProps<T>) {
  const imageSize = useMemo(() => SCREEN_WIDTH / columns, [columns]);

  if (isPending) {
    return <PhotoGridSkeleton columns={columns} />;
  }

  return (
    <FlatList
      data={images}
      nestedScrollEnabled
      keyExtractor={(item) => item.id}
      numColumns={columns}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.2}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListEmptyComponent={
        <Center className="flex-1 py-20">
          <Text className="text-label-muted">
            이미지가 존재하지 않습니다...
          </Text>
        </Center>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <Center className="py-4">
            <ActivityIndicator color={colors.brand.primary} />
          </Center>
        ) : null
      }
      renderItem={({ item, index }) => (
        <Pressable onPress={() => onPress?.(item, index)}>
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
