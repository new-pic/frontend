import type { ImageRef } from "expo-image";
import type { LoadedFeedReferenceImage } from "../model";

/**
 * Loads the selected Feed source once so its decoded size can choose the
 * Camera aspect ratio. The returned ImageRef can be reused by a renderer.
 */
export async function loadExpoFeedReferenceImage(
  imageUrl: string,
): Promise<LoadedFeedReferenceImage<ImageRef>> {
  const { Image } = await import("expo-image");
  const image = await Image.loadAsync(imageUrl);
  return {
    image,
    size: {
      width: image.width,
      height: image.height,
    },
  };
}

/**
 * Reads decoded dimensions without retaining a native ImageRef in React
 * state or the React Query cache.
 */
export async function readExpoFeedReferenceImageSize(
  imageUrl: string,
) {
  const loaded = await loadExpoFeedReferenceImage(imageUrl);
  try {
    return loaded.size;
  } finally {
    loaded.image.release();
  }
}
