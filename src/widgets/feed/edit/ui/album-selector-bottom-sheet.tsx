import {
  BottomSheetModal,
  HStack,
  Icon,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { useAppTranslation } from "@shared/lib";
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
  const { t } = useAppTranslation();
  const [albums, setAlbums] = useState<CustomAlbum[]>([]);

  useEffect(() => {
    const loadAlbums = async () => {
      const recentAlbum: CustomAlbum = {
        id: "RECENT_PHOTOS",
        title: t("feed.recentAlbum"),
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
  }, [onSelectAlbum, t]);

  return (
    <BottomSheetModal open={isOpen} onClose={onClose}>
      <VStack>
        <Text className="font-paperlogy-semibold text-lg px-6 py-3">
          {t("feed.selectAlbum")}
        </Text>
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
                <Text className="font-paperlogy-medium">{item.title}</Text>
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
