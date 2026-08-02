import type { FeedResponse } from "@entities/feed";
import type { GuideFeedSelection } from "../model/types";

type FeedGuideSelectionSource = Pick<
  FeedResponse,
  "id" | "thumbnailUrl" | "detailImageUrl"
>;

export function adaptFeedToGuideSelection(
  feed: FeedGuideSelectionSource,
): GuideFeedSelection {
  return {
    feedId: feed.id,
    thumbnailUrl: feed.thumbnailUrl,
    detailImageUrl: feed.detailImageUrl,
  };
}
