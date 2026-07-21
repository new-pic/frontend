import {
  BottomSheetModal,
  HStack,
  Icon,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { IconCheck } from "@tabler/icons-react-native";
import * as MediaLibrary from "expo-media-library";
import { useEffect, useState } from "react";
import { FlatList } from "react-native";
import { CustomAlbum } from "../model";

interface AlbumSelectorBottomSheetProps {
  selectedAlbum: CustomAlbum | null;
  onSelectAlbum: (album: CustomAlbum) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AlbumSelectorBottomSheet({
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
