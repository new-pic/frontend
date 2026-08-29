import { colors } from "@shared/ui/theme";
import { Image } from "expo-image";
import {
  IconCircle,
  IconCircleCheck,
  IconPhotoOff,
} from "@tabler/icons-react-native";
import { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  View,
  useWindowDimensions,
} from "react-native";
import { Box } from "../box";
import { Center } from "../center";
import { Icon } from "../icon";
import { Pressable } from "../pressable";
import { Skeleton } from "../skeleton";
import { Text } from "../text";
import {
  calculatePhotoGridItemWidth,
  resolvePhotoGridContentState,
} from "./photo-grid-layout";

const DEFAULT_GRID_GAP = 1;

export interface PhotoGridImage {
  id: string;
  imageUrl: string;
}

interface PhotoGridImageTileProps {
  image: PhotoGridImage;
  imageSize: number;
  selected: boolean;
  onPress: () => void;
  onSelectionPress?: () => void;
}

const PhotoGridImageTile = memo(function PhotoGridImageTile({
  image,
  imageSize,
  selected,
  onPress,
  onSelectionPress,
}: PhotoGridImageTileProps) {
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  return (
    <View
      style={{
        width: imageSize,
        aspectRatio: 4 / 5,
      }}
    >
      <Pressable onPress={onPress}>
        <Box
          style={{
            width: imageSize,
            aspectRatio: 4 / 5,
            overflow: "hidden",
          }}
        >
          {loadState === "loading" ? <Skeleton variant="sharp" /> : null}
          <Image
            source={image.imageUrl}
            recyclingKey={image.id}
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
        </Box>
      </Pressable>
      {onSelectionPress ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={selected ? "사진 선택 해제" : "사진 선택"}
          accessibilityState={{ checked: selected }}
          onPress={onSelectionPress}
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            backgroundColor: "rgba(0,0,0,0.24)",
          }}
        >
          <Icon
            className="h-7 w-7"
            as={selected ? IconCircleCheck : IconCircle}
            fill={selected ? colors.brand.primary : "transparent"}
            color="white"
          />
        </Pressable>
      ) : null}
    </View>
  );
});

function PhotoGridSkeleton({
  columns = 3,
  gap = DEFAULT_GRID_GAP,
}: {
  columns?: number;
  gap?: number;
}) {
  const { width } = useWindowDimensions();
  const imageSize = useMemo(
    () => calculatePhotoGridItemWidth(width, columns, gap),
    [columns, gap, width],
  );
  const skeletonItems = Array.from({ length: 20 }, (_, index) => index);

  return (
    <FlatList
      data={skeletonItems}
      keyExtractor={(item) => item.toString()}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? { gap } : undefined}
      ItemSeparatorComponent={() => <View style={{ height: gap }} />}
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
  selectedImages?: { id: string }[];
  columns?: number;
  gap?: number;
  onPress?: (image: T, index: number) => void;
  onSelectionPress?: (image: T, index: number) => void;
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
  gap = DEFAULT_GRID_GAP,
  onPress,
  onSelectionPress,
  onEndReached,
  onRefresh,
  refreshing = false,
  emptyMessage = "이미지가 존재하지 않습니다...",
  isPending = false,
  isFetchingNextPage = false,
}: PhotoGridProps<T>) {
  const { width } = useWindowDimensions();
  const imageSize = useMemo(
    () => calculatePhotoGridItemWidth(width, columns, gap),
    [columns, gap, width],
  );
  const contentState = resolvePhotoGridContentState({
    isPending,
    itemCount: images.length,
  });

  if (contentState === "pending") {
    return <PhotoGridSkeleton columns={columns} gap={gap} />;
  }

  return (
    <FlatList
      data={images}
      nestedScrollEnabled
      keyExtractor={(item) => item.id}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? { gap } : undefined}
      contentContainerStyle={
        contentState === "empty" ? { flexGrow: 1 } : undefined
      }
      ItemSeparatorComponent={() => <View style={{ height: gap }} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.2}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListEmptyComponent={
        <Center className="flex-1 w-full px-6">
          <Text className="text-label-muted">{emptyMessage}</Text>
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
            selectedImages?.some((selected) => selected.id === item.id) ?? false
          }
          onPress={() => onPress?.(item, index)}
          onSelectionPress={
            onSelectionPress ? () => onSelectionPress(item, index) : undefined
          }
        />
      )}
    />
  );
}
