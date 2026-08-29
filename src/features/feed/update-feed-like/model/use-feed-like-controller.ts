import { feedQuery } from "@entities/feed";
import { useCallback, useRef } from "react";
import {
  canToggleFeedLike,
  getFeedLikeToggleResult,
  type FeedLikeToggleResult,
} from "./feed-like-interaction";

interface UseFeedLikeControllerParams {
  feedId?: string;
  isLiked: boolean;
  requireMember: () => Promise<boolean>;
}

export function useFeedLikeController({
  feedId,
  isLiked,
  requireMember,
}: UseFeedLikeControllerParams) {
  const lastPressedAtRef = useRef(0);
  const mutationToLike = feedQuery.useLikeFeed();
  const mutationToUnlike = feedQuery.useUnlikeFeed();
  const isPending = mutationToLike.isPending || mutationToUnlike.isPending;

  const toggle = useCallback(async (): Promise<
    FeedLikeToggleResult | null
  > => {
    const now = Date.now();

    if (
      !canToggleFeedLike({
        feedId,
        isPending,
        lastPressedAt: lastPressedAtRef.current,
        now,
      })
    ) {
      return null;
    }

    lastPressedAtRef.current = now;

    if (!(await requireMember()) || !feedId) return null;

    const result = getFeedLikeToggleResult(isLiked);
    const mutation = isLiked ? mutationToUnlike : mutationToLike;
    mutation.mutate(feedId);
    return result;
  }, [
    feedId,
    isLiked,
    isPending,
    mutationToLike,
    mutationToUnlike,
    requireMember,
  ]);

  return {
    isPending,
    toggle,
  };
}
