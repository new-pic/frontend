import { FeedResponse } from "@entities/feed";
import {
  BottomSheetModal,
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
import { IconCheck, IconChevronRight } from "@tabler/icons-react-native";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useEffect, useState } from "react";

import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface CustomAlbum {
  id: string;
  title: string;
  rawAlbum: MediaLibrary.Album | null; // 원본 객체도 나중에 Query 쓸 때 필요하니 보관
  isRecent?: boolean; // 최근 항목 여부를 나타내는 플래그
}
export interface ImageSelectorProps {
  selectedImages?: FeedResponse[];
  onSelectImage?: (image: FeedResponse) => void;
  onLoadingAlbum?: (loading: boolean) => void;
}

function ImageSelectorView({
  selectedImages,
  onSelectImage,
  onLoadingAlbum,
}: ImageSelectorProps) {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<CustomAlbum | null>(null);
  const [images, setImages] = useState<FeedResponse[]>([]);

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
    let isCancelled = false;

    const fetchPhotos = async () => {
      if (!selectedAlbum) return; // 선택된 앨범이 아직 없으면 패스

      onLoadingAlbum?.(true);

      try {
        const queryBase = new MediaLibrary.Query()
          .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
          .orderBy({
            key: MediaLibrary.AssetField.CREATION_TIME,
            ascending: false,
          })
          .limit(40);

        if (selectedAlbum.rawAlbum && !selectedAlbum.isRecent) {
          queryBase.album(selectedAlbum.rawAlbum);
        }

        const fetchedImages = await queryBase.exe();
        const finalizedImages = await Promise.all(
          fetchedImages.map(async (asset) => {
            const [coverUri, fileName] = await Promise.all([
              asset.getUri(),
              asset.getFilename(),
            ]);
            return {
              id: asset.id,
              imageUrl: coverUri,
              fileName,
            };
          }),
        );

        if (!isCancelled) {
          setImages(finalizedImages);
        }
      } catch (error) {
        console.error("앨범 사진 조회에 실패했습니다.", error);
      } finally {
        if (!isCancelled) {
          onLoadingAlbum?.(false);
        }
      }
    };

    void fetchPhotos();

    return () => {
      isCancelled = true;
    };
  }, [selectedAlbum, onLoadingAlbum]);

  return (
    <>
      <VStack space="md" className="border-t pt-3 border-outline-light flex-1">
        <Pressable className="px-6" onPress={handleOpenAlbumSheet}>
          <HStack className="items-center" space="sm">
            <Text className="font-semibold" size="lg">
              {selectedAlbum?.title ?? "앨범 선택"}
            </Text>
            <Icon as={IconChevronRight} />
          </HStack>
        </Pressable>

        <PhotoGrid
          images={images}
          selectedImages={selectedImages}
          columns={4}
          onPress={(image) => onSelectImage?.(image)}
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

interface AlbumSelectorBottomSheetProps {
  selectedAlbum: CustomAlbum | null;
  onSelectAlbum: (album: CustomAlbum) => void;
  isOpen: boolean;
  onClose: () => void;
}

function AlbumSelectorBottomSheet({
  isOpen,
  selectedAlbum,
  onSelectAlbum,
  onClose,
}: AlbumSelectorBottomSheetProps) {
  const [albums, setAlbums] = useState<CustomAlbum[]>([]);

  useEffect(() => {
    const loadAlbums = async () => {
      const recentAlbum: CustomAlbum = {
        id: "RECENT_PHOTOS",
        title: "최근 항목",
        rawAlbum: null,
        isRecent: true,
      };

      setAlbums([recentAlbum]);
      onSelectAlbum(recentAlbum);

      try {
        const fetchedAlbums = await MediaLibrary.Album.getAll();
        const finalizedAlbums = await Promise.all(
          fetchedAlbums.map(async (album) => ({
            id: album.id,
            title: await album.getTitle(),
            rawAlbum: album,
          })),
        );
        setAlbums([recentAlbum, ...finalizedAlbums]);
      } catch (error) {
        console.error("앨범 목록 조회에 실패했습니다.", error);
      }
    };

    void loadAlbums();
  }, [onSelectAlbum]);

  return (
    <BottomSheetModal open={isOpen} onClose={onClose}>
      <VStack>
        <Text className="font-semibold text-lg px-6 py-3">앨범 선택</Text>
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelectAlbum(item);
                onClose();
              }}
            >
              <HStack
                className="px-6 py-3 items-center justify-between"
                space="sm"
              >
                <Text className="font-medium">{item.title}</Text>
                {selectedAlbum?.id === item.id && (
                  <Icon as={IconCheck} color="primary" />
                )}
              </HStack>
            </Pressable>
          )}
        />
      </VStack>
    </BottomSheetModal>
  );
}

export function ImageSelector({ ...props }: ImageSelectorProps) {
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
          <Text>갤러리 접근 권한이 필요합니다.</Text>
          <Button onPress={requestPermission}>
            <ButtonText>권한 요청하기</ButtonText>
          </Button>
        </Center>
      </SafeAreaView>
    );
  }

  return <ImageSelectorView {...props} />;
}
