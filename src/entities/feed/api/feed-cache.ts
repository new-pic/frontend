import type { FeedResponse } from "../model";

interface FeedListPage {
  items: FeedResponse[];
  [key: string]: unknown;
}

interface InfiniteFeedListData {
  pages: FeedListPage[];
  [key: string]: unknown;
}

function isFeed(value: unknown): value is FeedResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<FeedResponse>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.detailImageUrl === "string" &&
    typeof candidate.isLiked === "boolean" &&
    typeof candidate.likeCount === "number"
  );
}

function isInfiniteFeedListData(
  value: unknown,
): value is InfiniteFeedListData {
  if (!value || typeof value !== "object") return false;

  const pages = (value as { pages?: unknown }).pages;
  return (
    Array.isArray(pages) &&
    pages.some(
      (page) =>
        page &&
        typeof page === "object" &&
        Array.isArray((page as { items?: unknown }).items) &&
        (page as { items: unknown[] }).items.some(isFeed),
    )
  );
}

export function updateFeedInCacheData(
  data: unknown,
  feedId: string,
  update: (feed: FeedResponse) => FeedResponse,
): unknown {
  if (isFeed(data)) {
    return data.id === feedId ? update(data) : data;
  }

  if (!isInfiniteFeedListData(data)) return data;

  let didUpdate = false;
  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.map((feed) => {
      if (feed.id !== feedId) return feed;
      didUpdate = true;
      return update(feed);
    }),
  }));

  return didUpdate ? { ...data, pages } : data;
}
