export type PhotoGridContentState = "pending" | "empty" | "content";

interface ResolvePhotoGridContentStateParams {
  isPending: boolean;
  itemCount: number;
}

export function resolvePhotoGridContentState({
  isPending,
  itemCount,
}: ResolvePhotoGridContentStateParams): PhotoGridContentState {
  if (isPending) return "pending";
  return itemCount === 0 ? "empty" : "content";
}

export function calculatePhotoGridItemWidth(
  containerWidth: number,
  columns: number,
  gap: number,
) {
  if (columns <= 0) {
    throw new Error("PhotoGrid columns는 1 이상이어야 합니다.");
  }

  const safeWidth = Math.max(0, containerWidth);
  const safeGap = Math.max(0, gap);
  return Math.max(
    0,
    (safeWidth - safeGap * (columns - 1)) / columns,
  );
}
