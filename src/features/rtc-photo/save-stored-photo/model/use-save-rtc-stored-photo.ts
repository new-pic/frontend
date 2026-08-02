import type { RtcStoredPhoto } from "@entities/rtc-stored-photo";
import { saveImageToMediaLibrary } from "@shared/lib";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useRef, useState } from "react";

export type SaveRtcStoredPhotoResult =
  | "SAVED"
  | "PERMISSION_DENIED"
  | "EXPIRED"
  | "FAILED"
  | "BUSY";

export function useSaveRtcStoredPhoto() {
  const [savingPhotoId, setSavingPhotoId] = useState<string | null>(
    null,
  );
  const isSavingRef = useRef(false);
  const [permissionResponse, requestPermission] =
    MediaLibrary.usePermissions({
      writeOnly: true,
      granularPermissions: ["photo"],
    });

  const savePhoto = useCallback(
    async (
      photo: RtcStoredPhoto,
    ): Promise<SaveRtcStoredPhotoResult> => {
      if (isSavingRef.current) return "BUSY";
      if (Date.parse(photo.expiresAt) <= Date.now()) return "EXPIRED";

      isSavingRef.current = true;
      setSavingPhotoId(photo.id);

      try {
        const permission = permissionResponse?.granted
          ? permissionResponse
          : await requestPermission();
        if (!permission.granted) return "PERMISSION_DENIED";

        await saveImageToMediaLibrary(photo);
        return "SAVED";
      } catch {
        return Date.parse(photo.expiresAt) <= Date.now()
          ? "EXPIRED"
          : "FAILED";
      } finally {
        isSavingRef.current = false;
        setSavingPhotoId(null);
      }
    },
    [permissionResponse, requestPermission],
  );

  return {
    isSaving: savingPhotoId !== null,
    savingPhotoId,
    savePhoto,
  };
}
