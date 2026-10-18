import {
  Button,
  ButtonText,
  Center,
  HStack,
  Icon,
  PhotoGrid,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { useAppTranslation } from "@shared/lib";
import { IconChevronRight } from "@tabler/icons-react-native";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SafeAreaView } from "react-native-safe-area-context";
import { mediaLibraryQuery } from "../api";
import { CustomAlbum, ImageParams } from "../model";
import { AlbumSelectorBottomSheet } from "./album-selector-bottom-sheet";

export interface ImageSelectorProps {
  selectedImages?: ImageParams[];
  onSelectImage?: (image: ImageParams) => void;
  onLoadingAlbum?: (loading: boolean) => void;
}

function ImageSelectorView({
  selectedImages,
  onSelectImage,
  onLoadingAlbum,
}: ImageSelectorProps) {
  const { t } = useAppTranslation();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<CustomAlbum | null>(null);
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
  } = mediaLibraryQuery.useReadAlbumImages(selectedAlbum);
  const images = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const onChangeAlbum = useCallback((album: CustomAlbum) => {
    setSelectedAlbum(album);
  }, []);

  const handleOpenAlbumSheet = () => {
    setIsBottomSheetOpen(true);
  };

  const handleCloseAlbumSheet = () => {
    setIsBottomSheetOpen(false);
  };

  useEffect(() => {
    onLoadingAlbum?.(isLoading);
  }, [isLoading, onLoadingAlbum]);

  useEffect(() => {
    if (isError) {
      console.error("앨범 사진 조회에 실패했습니다.", error);
    }
  }, [error, isError]);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      <VStack space="md" className="border-t pt-3 border-outline-light flex-1">
        <Pressable className="px-6" onPress={handleOpenAlbumSheet}>
          <HStack className="items-center" space="sm">
            <Text className="font-semibold" size="lg">
              {selectedAlbum?.title ?? t("feed.selectAlbum")}
            </Text>
            <Icon as={IconChevronRight} />
          </HStack>
        </Pressable>

        <PhotoGrid
          images={images}
          selectedImages={selectedImages}
          columns={4}
          onPress={(image) => onSelectImage?.(image)}
          onEndReached={handleEndReached}
          isFetchingNextPage={isFetchingNextPage}
        />
      </VStack>
      <AlbumSelectorBottomSheet
        isOpen={isBottomSheetOpen}
        selectedAlbum={selectedAlbum}
        onSelectAlbum={onChangeAlbum}
        onClose={handleCloseAlbumSheet}
      />
    </>
  );
}

export function ImageSelector({ ...props }: ImageSelectorProps) {
  const { t } = useAppTranslation();
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  useEffect(() => {
    if (
      permissionResponse &&
      !permissionResponse.granted &&
      permissionResponse.canAskAgain
    ) {
      void requestPermission();
    }
  }, [permissionResponse, requestPermission]);

  // 권한이 거부되었을 때 예외 처리
  if (!permissionResponse?.granted) {
    return (
      <SafeAreaView>
        <Center className="flex-1">
          <Text>{t("feed.galleryPermission")}</Text>
          <Button onPress={requestPermission}>
            <ButtonText>{t("feed.requestPermission")}</ButtonText>
          </Button>
        </Center>
      </SafeAreaView>
    );
  }

  return <ImageSelectorView {...props} />;
}
