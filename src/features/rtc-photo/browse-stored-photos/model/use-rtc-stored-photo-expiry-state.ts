import { useEffect, useMemo, useState } from "react";
import { RTC_STORED_PHOTO_GALLERY_CONFIG } from "../config/rtc-stored-photo-gallery-config";
import {
  getRtcStoredPhotoExpiryState,
  getRtcStoredPhotoExpiryTransitionDelay,
} from "../lib/rtc-stored-photo-details";

export function useRtcStoredPhotoExpiryState(expiresAt: string) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const evaluatedAt = Math.max(nowMs, Date.now());
  const state = useMemo(
    () =>
      getRtcStoredPhotoExpiryState(
        expiresAt,
        evaluatedAt,
        RTC_STORED_PHOTO_GALLERY_CONFIG.expiringSoonThresholdMs,
      ),
    [evaluatedAt, expiresAt],
  );
  const transitionDelay = useMemo(
    () =>
      getRtcStoredPhotoExpiryTransitionDelay(
        expiresAt,
        evaluatedAt,
        RTC_STORED_PHOTO_GALLERY_CONFIG.expiringSoonThresholdMs,
      ),
    [evaluatedAt, expiresAt],
  );

  useEffect(() => {
    if (transitionDelay === null) return;

    const timeout = setTimeout(
      () => setNowMs(Date.now()),
      transitionDelay +
        RTC_STORED_PHOTO_GALLERY_CONFIG.expiryTimerGraceMs,
    );
    return () => clearTimeout(timeout);
  }, [transitionDelay]);

  return state;
}
