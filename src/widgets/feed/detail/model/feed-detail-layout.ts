export const FEED_DETAIL_GUIDE_FAB_SIZE = 56;
export const FEED_DETAIL_BASE_COMMENT_BOTTOM_PADDING = 104;

export function getFeedDetailCommentBottomPadding(safeAreaBottom: number) {
  return (
    FEED_DETAIL_BASE_COMMENT_BOTTOM_PADDING +
    FEED_DETAIL_GUIDE_FAB_SIZE / 2 +
    Math.max(0, safeAreaBottom)
  );
}

export function getFeedDetailGuideFabBottomOffset(safeAreaBottom: number) {
  return Math.max(0, safeAreaBottom);
}
