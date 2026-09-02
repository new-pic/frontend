import {
  saveImageToMediaLibrary,
  type MediaLibraryImageSource,
} from "@shared/lib";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useRef, useState } from "react";

export type SaveImagesToLibraryResult =
  | { status: "SAVED"; savedCount: number; failedImageIds: [] }
  | {
      status: "PARTIALLY_SAVED";
      savedCount: number;
      failedImageIds: string[];
    }
  | { status: "FAILED"; savedCount: 0; failedImageIds: string[] }
  | { status: "PERMISSION_DENIED" }
  | { status: "BUSY" };

export function useSaveImagesToLibrary() {
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({
    writeOnly: true,
    granularPermissions: ["photo"],
  });

  const saveImages = useCallback(
    async (
      images: MediaLibraryImageSource[],
    ): Promise<SaveImagesToLibraryResult> => {
      if (isSavingRef.current) return { status: "BUSY" };

      isSavingRef.current = true;
      setIsSaving(true);

      try {
        const permission = permissionResponse?.granted
          ? permissionResponse
          : await requestPermission().catch(() => null);
        if (!permission?.granted) return { status: "PERMISSION_DENIED" };

        const failedImageIds: string[] = [];
        let savedCount = 0;

        for (const image of images) {
          try {
            await saveImageToMediaLibrary(image);
            savedCount += 1;
          } catch {
            failedImageIds.push(image.id);
          }
        }

        if (failedImageIds.length === 0) {
          return { status: "SAVED", savedCount, failedImageIds: [] };
        }
        if (savedCount > 0) {
          return {
            status: "PARTIALLY_SAVED",
            savedCount,
            failedImageIds,
          };
        }
        return { status: "FAILED", savedCount: 0, failedImageIds };
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [permissionResponse, requestPermission],
  );

  return { isSaving, saveImages };
}
