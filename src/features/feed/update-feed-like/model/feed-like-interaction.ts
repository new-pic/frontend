export const FEED_LIKE_THROTTLE_MS = 500;

export type FeedLikeToggleResult = "LIKED" | "UNLIKED";

interface CanToggleFeedLikeParams {
  feedId?: string;
  isPending: boolean;
  lastPressedAt: number;
  now: number;
}

export function canToggleFeedLike({
  feedId,
  isPending,
  lastPressedAt,
  now,
}: CanToggleFeedLikeParams) {
  if (!feedId || isPending) return false;
  return now - lastPressedAt > FEED_LIKE_THROTTLE_MS;
}

export function getFeedLikeToggleResult(
  isLiked: boolean,
): FeedLikeToggleResult {
  return isLiked ? "UNLIKED" : "LIKED";
}
