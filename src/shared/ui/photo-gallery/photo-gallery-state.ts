export function clampPhotoGalleryIndex(
  index: number,
  imageCount: number,
): number {
  if (imageCount <= 0) return 0;
  return Math.min(Math.max(0, Math.floor(index)), imageCount - 1);
}
