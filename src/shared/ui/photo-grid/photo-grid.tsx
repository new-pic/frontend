import { colors } from "@shared/constants";
import { Image } from "expo-image";
import {
  IconCircleCheck,
  IconPhotoOff,
} from "@tabler/icons-react-native";
import { memo, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList } from "react-native";
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

interface PhotoGridImageTileProps {
  image: PhotoGridImage;
  imageSize: number;
  selected: boolean;
  onPress: () => void;
}

const PhotoGridImageTile = memo(function PhotoGridImageTile({
  image,
  imageSize,
  selected,
  onPress,
}: PhotoGridImageTileProps) {
  const [loadState, setLoadState] = useState<
    "loading" | "loaded" | "failed"
  >("loading");

  return (
    <Pressable onPress={onPress}>
      <Box
        style={{
          width: imageSize,
          aspectRatio: 4 / 5,
          overflow: "hidden",
        }}
      >
        {loadState === "loading" ? (
          <Skeleton variant="sharp" />
        ) : null}
        <Image
          source={image.imageUrl}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            opacity: loadState === "failed" ? 0 : 1,
          }}
          onLoadStart={() => setLoadState("loading")}
          onDisplay={() => setLoadState("loaded")}
          onError={() => setLoadState("failed")}
        />
        {loadState === "failed" ? (
          <Center className="h-full w-full bg-background-muted">
            <IconPhotoOff size={24} color={colors.outline} />
          </Center>
        ) : null}
        {selected ? (
          <Fab className="p-0 h-6 top-1 right-1">
            <FabIcon
              className="w-6 h-6"
              as={IconCircleCheck}
              fill={colors.brand.primary}
              color="white"
            />
          </Fab>
        ) : null}
      </Box>
    </Pressable>
  );
});

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
  emptyMessage?: string;
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
  emptyMessage = "이미지가 존재하지 않습니다...",
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
            {emptyMessage}
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
        <PhotoGridImageTile
          image={item}
          imageSize={imageSize}
          selected={
            selectedImages?.some(
              (selected) => selected.id === item.id,
            ) ?? false
          }
          onPress={() => onPress?.(item, index)}
        />
      )}
    />
  );
}
