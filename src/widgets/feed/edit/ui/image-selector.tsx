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
import { useEffect, useState } from "react";

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
}

function ImageSelectorView({
  selectedImages,
  onSelectImage,
}: ImageSelectorProps) {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<CustomAlbum | null>(null);
  const [images, setImages] = useState<FeedResponse[]>([]);

  console.log("ImageSelectorView isBottomSheetOpen:", isBottomSheetOpen);

  const onChangeAlbum = async (album: CustomAlbum) => {
    setSelectedAlbum(album);
  };

  const handleOpenAlbumSheet = () => {
    setIsBottomSheetOpen(true);
    console.log("ImageSelectorView isBottomSheetOpen:", isBottomSheetOpen);
  };

  const handleCloseAlbumSheet = () => {
    setIsBottomSheetOpen(false);
    console.log("ImageSelectorView isBottomSheetOpen:", isBottomSheetOpen);
  };

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!selectedAlbum) return; // 선택된 앨범이 아직 없으면 패스

      // 최신 Query API로 사진 40장 가져오기
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

      // Promise 비동기 풀기 (Asset 주소 string으로 파싱)
      const promises = fetchedImages.map(async (asset) => {
        const coverUri = await asset.getUri();
        return {
          id: asset.id,
          imageUrl: coverUri,
        };
      });

      const finalizedAlbums = await Promise.all(promises);
      setImages(finalizedAlbums);
    };
    fetchPhotos();
  }, [selectedAlbum]);

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
    const handleSetRecentAlbum = () => {
      const recentAlbum: CustomAlbum = {
        id: "RECENT_PHOTOS",
        title: "최근 항목",
        rawAlbum: null,
        isRecent: true,
      };
      return recentAlbum;
    };
    handleSetRecentAlbum();

    const handleGetAlbums = async () => {
      const fetchedAlbums = await MediaLibrary.Album.getAll();
      const albumPromises = fetchedAlbums.map(async (album) => {
        const title = await album.getTitle(); // 👈 여기서 await로 string을 뽑아냄
        return {
          id: album.id,
          title: title,
          rawAlbum: album,
        };
      });
      const finalizedAlbums = await Promise.all(albumPromises);

      return finalizedAlbums;
    };
    const handleSetAlbems = async () => {
      const recentAlbum = handleSetRecentAlbum();
      const finalizedAlbums = await handleGetAlbums();
      setAlbums([recentAlbum, ...finalizedAlbums]);
      onSelectAlbum(recentAlbum);
    };
    handleSetAlbems();
  }, []);

  return (
    <BottomSheetModal open={isOpen} onClose={onClose}>
      <VStack className="">
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
    // 권한이 없거나, 권한이 거부되었거나, 권한을 다시 요청할 수 있는 경우 권한 요청
    if (
      !permissionResponse ||
      !permissionResponse?.granted ||
      permissionResponse.canAskAgain
    ) {
      requestPermission();
    }
  }, [permissionResponse]);

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
