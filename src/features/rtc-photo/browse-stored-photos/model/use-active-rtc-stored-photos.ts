import {
  rtcStoredPhotoQueryKeys,
  type RtcStoredPhoto,
} from "@entities/rtc-stored-photo";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RTC_STORED_PHOTO_GALLERY_CONFIG } from "../config/rtc-stored-photo-gallery-config";
import {
  filterActiveRtcStoredPhotos,
  getNextRtcStoredPhotoExpiryDelay,
} from "../lib/rtc-stored-photo-visibility";

export function useActiveRtcStoredPhotos(photos: RtcStoredPhoto[]) {
  const queryClient = useQueryClient();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const visibility = useMemo(() => {
    const evaluatedAt = Math.max(nowMs, Date.now());
    return {
      activePhotos: filterActiveRtcStoredPhotos(photos, evaluatedAt),
      evaluatedAt,
    };
  }, [nowMs, photos]);
  const nextExpiryDelay = useMemo(
    () =>
      getNextRtcStoredPhotoExpiryDelay(
        visibility.activePhotos,
        visibility.evaluatedAt,
      ),
    [visibility],
  );

  useEffect(() => {
    if (nextExpiryDelay === null) return;

    const timeout = setTimeout(() => {
      setNowMs(Date.now());
      void queryClient.invalidateQueries({
        queryKey: rtcStoredPhotoQueryKeys.all,
      });
    }, nextExpiryDelay + RTC_STORED_PHOTO_GALLERY_CONFIG.expiryTimerGraceMs);

    return () => clearTimeout(timeout);
  }, [nextExpiryDelay, queryClient]);

  return visibility.activePhotos;
}
