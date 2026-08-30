import { useInfiniteQuery } from "@tanstack/react-query";
import * as MediaLibrary from "expo-media-library";
import { CustomAlbum, ImageParams, mediaLibraryQueryKeys } from "../model";
const PAGE_SIZE = 20;

interface AlbumImagePage {
  items: ImageParams[];
  nextOffset?: number;
}

async function readAlbumImages({
  album,
  offset,
}: {
  album: CustomAlbum;
  offset: number;
}): Promise<AlbumImagePage> {
  const query = new MediaLibrary.Query()
    .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
    .orderBy({
      key: MediaLibrary.AssetField.CREATION_TIME,
      ascending: false,
    })
    .offset(offset)
    .limit(PAGE_SIZE);

  if (album.rawAlbum && !album.isRecent) {
    query.album(album.rawAlbum);
  }

  const assets = await query.exe();
  const items = await Promise.all(
    assets.map(async (asset) => {
      const [imageUrl, fileName] = await Promise.all([
        asset.getUri(),
        asset.getFilename(),
      ]);

      return {
        id: asset.id,
        imageUrl,
        fileName,
      };
    }),
  );

  return {
    items,
    nextOffset:
      assets.length === PAGE_SIZE ? offset + assets.length : undefined,
  };
}

export function useReadAlbumImages(album: CustomAlbum | null) {
  return useInfiniteQuery({
    queryKey: mediaLibraryQueryKeys.albumImages(album?.id),
    queryFn: ({ pageParam }) => {
      if (!album) {
        throw new Error("조회할 앨범이 선택되지 않았습니다.");
      }

      return readAlbumImages({ album, offset: pageParam });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: Boolean(album),
    staleTime: 1000 * 30,
  });
}
