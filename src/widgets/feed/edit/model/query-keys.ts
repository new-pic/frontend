export const mediaLibraryQueryKeys = {
  all: ["device", "media-library"] as const,
  albumImages: (albumId?: string) =>
    [...mediaLibraryQueryKeys.all, "album-images", albumId] as const,
} as const;
