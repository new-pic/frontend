import type { RtcStoredPhoto } from "@entities/rtc-stored-photo";

export function filterActiveRtcStoredPhotos(
  photos: RtcStoredPhoto[],
  nowMs: number,
) {
  return photos.filter(({ expiresAt }) => {
    const expiryMs = Date.parse(expiresAt);
    return Number.isFinite(expiryMs) && expiryMs > nowMs;
  });
}

export function getNextRtcStoredPhotoExpiryDelay(
  photos: RtcStoredPhoto[],
  nowMs: number,
): number | null {
  let nearestExpiryMs = Number.POSITIVE_INFINITY;

  for (const { expiresAt } of photos) {
    const expiryMs = Date.parse(expiresAt);
    if (Number.isFinite(expiryMs) && expiryMs > nowMs) {
      nearestExpiryMs = Math.min(nearestExpiryMs, expiryMs);
    }
  }

  return Number.isFinite(nearestExpiryMs)
    ? Math.max(0, nearestExpiryMs - nowMs)
    : null;
}

export function mergeUniqueRtcStoredPhotos(
  pages: { items: RtcStoredPhoto[] }[] | undefined,
) {
  const photosById = new Map<string, RtcStoredPhoto>();

  for (const page of pages ?? []) {
    for (const photo of page.items) {
      photosById.set(photo.id, photo);
    }
  }

  return [...photosById.values()];
}
