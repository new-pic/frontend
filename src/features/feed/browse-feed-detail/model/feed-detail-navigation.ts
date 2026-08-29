import type { Href } from "expo-router";

export const FEED_DETAIL_SOURCES = [
  "public",
  "mine",
  "saved",
  "liked",
] as const;

export type FeedDetailSource = (typeof FEED_DETAIL_SOURCES)[number];

interface CreateFeedDetailHrefParams {
  feedId: string;
  index: number;
  source: FeedDetailSource;
  take: number;
  q?: string;
  tag?: string;
}

export function parseFeedDetailSource(
  value: string | string[] | undefined,
): FeedDetailSource | null {
  const source = Array.isArray(value) ? value[0] : value;
  if (source === undefined) return "public";

  return FEED_DETAIL_SOURCES.some((candidate) => candidate === source)
    ? (source as FeedDetailSource)
    : null;
}

export function createFeedDetailHref({
  feedId,
  index,
  source,
  take,
  q,
  tag,
}: CreateFeedDetailHrefParams): Href {
  return {
    pathname: "/feed/[id]",
    params: {
      id: feedId,
      index: String(index),
      source,
      take: String(take),
      q,
      tag,
    },
  };
}

export function findFeedDetailInitialIndex(
  feeds: readonly { id: string }[],
  feedId: string,
  requestedIndex: number,
) {
  if (feeds.length === 0) return 0;

  if (
    Number.isInteger(requestedIndex) &&
    requestedIndex >= 0 &&
    requestedIndex < feeds.length &&
    feeds[requestedIndex]?.id === feedId
  ) {
    return requestedIndex;
  }

  const feedIndex = feeds.findIndex((feed) => feed.id === feedId);
  return feedIndex >= 0 ? feedIndex : 0;
}
