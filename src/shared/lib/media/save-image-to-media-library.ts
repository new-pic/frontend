import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

const REMOTE_URI_PATTERN = /^https:\/\//i;
const LOCAL_FILE_URI_PATTERN = /^file:\/\//i;
const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

export interface MediaLibraryImageSource {
  id: string;
  imageUrl: string;
}

function getRemoteImageExtension(uri: string): string {
  const pathWithoutQuery = uri.split(/[?#]/, 1)[0];
  return pathWithoutQuery.match(IMAGE_EXTENSION_PATTERN)?.[0] ?? ".jpg";
}

function createTemporaryImageFile(image: MediaLibraryImageSource): File {
  const safeId = image.id.replace(/[^a-z0-9_-]/gi, "-").slice(0, 40) || "image";
  const extension = getRemoteImageExtension(image.imageUrl);

  return new File(Paths.cache, `newpic-${safeId}-${Date.now()}${extension}`);
}

export async function saveImageToMediaLibrary(
  image: MediaLibraryImageSource,
): Promise<void> {
  if (!REMOTE_URI_PATTERN.test(image.imageUrl)) {
    if (!LOCAL_FILE_URI_PATTERN.test(image.imageUrl)) {
      throw new Error("Unsupported image URI");
    }
    await MediaLibrary.Asset.create(image.imageUrl);
    return;
  }

  const temporaryFile = createTemporaryImageFile(image);

  try {
    const downloadedFile = await File.downloadFileAsync(
      image.imageUrl,
      temporaryFile,
      { idempotent: true },
    );
    await MediaLibrary.Asset.create(downloadedFile.uri);
  } finally {
    try {
      if (temporaryFile.exists) temporaryFile.delete();
    } catch {
      // 사진 저장 결과와 무관한 cache 정리 실패는 무시합니다.
    }
  }
}
