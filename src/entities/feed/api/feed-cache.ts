import type {
  FeedCommentResponse,
  FeedListParams,
  FeedListResponse,
  FeedResponse,
} from "../model";
import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

type FeedListInfiniteData = InfiniteData<
  FeedListResponse,
  FeedListParams["cursor"]
>;

type FeedCacheSnapshot = [QueryKey, unknown][];

interface FeedListPage {
  items: FeedResponse[];
  [key: string]: unknown;
}

interface InfiniteFeedListData {
  pages: FeedListPage[];
  [key: string]: unknown;
}

interface FeedCommentListPage {
  items: FeedCommentResponse[];
  [key: string]: unknown;
}

interface InfiniteFeedCommentListData {
  pages: FeedCommentListPage[];
  [key: string]: unknown;
}

function isFeed(value: unknown): value is FeedResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<FeedResponse>;
  return (
    typeof candidate.id === "string" &&
    candidate.author !== undefined &&
    typeof candidate.author.id === "string" &&
    typeof candidate.detailImageUrl === "string" &&
    typeof candidate.isLiked === "boolean" &&
    typeof candidate.likeCount === "number"
  );
}

function isFeedComment(value: unknown): value is FeedCommentResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<FeedCommentResponse>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.content === "string" &&
    candidate.user !== undefined &&
    typeof candidate.user.id === "string"
  );
}

function isInfiniteFeedListData(value: unknown): value is InfiniteFeedListData {
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

function isInfiniteFeedCommentListData(
  value: unknown,
): value is InfiniteFeedCommentListData {
  if (!value || typeof value !== "object") return false;

  const pages = (value as { pages?: unknown }).pages;
  return (
    Array.isArray(pages) &&
    pages.some(
      (page) =>
        page &&
        typeof page === "object" &&
        Array.isArray((page as { items?: unknown }).items) &&
        (page as { items: unknown[] }).items.some(isFeedComment),
    )
  );
}

export function isFeedAuthoredBy(data: unknown, userId: string) {
  return isFeed(data) && data.author.id === userId;
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

export function removeFeedFromListCacheData(
  data: unknown,
  feedId: string,
): unknown {
  if (!isInfiniteFeedListData(data)) return data;

  let didRemove = false;
  const pages = data.pages.map((page) => {
    const items = page.items.filter((feed) => feed.id !== feedId);
    if (items.length === page.items.length) return page;

    didRemove = true;
    return { ...page, items };
  });

  return didRemove ? { ...data, pages } : data;
}

export function removeFeedsByAuthorFromCacheData(
  data: unknown,
  userId: string,
): unknown {
  if (!isInfiniteFeedListData(data)) return data;

  let didRemove = false;
  const pages = data.pages.map((page) => {
    const items = page.items.filter((feed) => feed.author.id !== userId);
    if (items.length === page.items.length) return page;

    didRemove = true;
    return { ...page, items };
  });

  return didRemove ? { ...data, pages } : data;
}

export function removeCommentsByAuthorFromCacheData(
  data: unknown,
  userId: string,
): unknown {
  if (!isInfiniteFeedCommentListData(data)) return data;

  let didRemove = false;
  const pages = data.pages.map((page) => {
    const items = page.items.filter((comment) => comment.user.id !== userId);
    if (items.length === page.items.length) return page;

    didRemove = true;
    return { ...page, items };
  });

  return didRemove ? { ...data, pages } : data;
}

export function updateFeedLists(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updateItems: (items: FeedResponse[]) => FeedResponse[],
) {
  queryClient.setQueriesData<FeedListInfiniteData>({ queryKey }, (old) => {
    if (!old) return old;

    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: updateItems(page.items),
      })),
    };
  });
}

export async function optimisticallyUpdateFeedAcrossCollections(
  queryClient: QueryClient,
  feedId: string,
  update: (feed: FeedResponse) => FeedResponse,
) {
  const matchingQueries = queryClient
    .getQueryCache()
    .findAll()
    .filter((query) => {
      const data = query.state.data;
      return updateFeedInCacheData(data, feedId, update) !== data;
    });

  await Promise.all(
    matchingQueries.map((query) =>
      queryClient.cancelQueries({
        queryKey: query.queryKey,
        exact: true,
      }),
    ),
  );

  const previousFeedCaches: FeedCacheSnapshot = matchingQueries.map((query) => [
    query.queryKey,
    queryClient.getQueryData(query.queryKey),
  ]);

  matchingQueries.forEach((query) => {
    queryClient.setQueryData(query.queryKey, (data: unknown) =>
      updateFeedInCacheData(data, feedId, update),
    );
  });

  return previousFeedCaches;
}

export async function optimisticallyRemoveFeedAcrossCollections(
  queryClient: QueryClient,
  feedId: string,
) {
  const matchingQueries = queryClient
    .getQueryCache()
    .findAll()
    .filter((query) => {
      const data = query.state.data;
      return removeFeedFromListCacheData(data, feedId) !== data;
    });

  await Promise.all(
    matchingQueries.map((query) =>
      queryClient.cancelQueries({
        queryKey: query.queryKey,
        exact: true,
      }),
    ),
  );

  const previousFeedCaches: FeedCacheSnapshot = matchingQueries.map((query) => [
    query.queryKey,
    queryClient.getQueryData(query.queryKey),
  ]);

  matchingQueries.forEach((query) => {
    queryClient.setQueryData(query.queryKey, (data: unknown) =>
      removeFeedFromListCacheData(data, feedId),
    );
  });

  return previousFeedCaches;
}

export function rollbackFeedCaches(
  queryClient: QueryClient,
  snapshot?: FeedCacheSnapshot,
) {
  snapshot?.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}
