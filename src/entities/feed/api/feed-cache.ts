import type {
  FeedCommentResponse,
  FeedListParams,
  FeedListResponse,
  FeedResponse,
} from "../model";
import { feedQueryKeys } from "../model/feed-query-keys";
import { userFeedQueryKeys } from "../model/user-feed-query-keys";
import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

type FeedListInfiniteData = InfiniteData<
  FeedListResponse,
  FeedListParams["cursor"]
>;

interface FeedUpdateCacheSnapshot {
  queryKey: QueryKey;
  previousFeed: FeedResponse;
}

interface RemovedFeedLocation {
  pageIndex: number;
  itemIndex: number;
  feed: FeedResponse;
}

interface RemovedFeedCacheSnapshot {
  queryKey: QueryKey;
  removedFeeds: RemovedFeedLocation[];
}

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

function hasFeedListPages(value: unknown): value is InfiniteFeedListData {
  if (!value || typeof value !== "object") return false;

  const pages = (value as { pages?: unknown }).pages;
  return (
    Array.isArray(pages) &&
    pages.every(
      (page) =>
        page &&
        typeof page === "object" &&
        Array.isArray((page as { items?: unknown }).items),
    )
  );
}

function findFeedInCacheData(
  data: unknown,
  feedId: string,
): FeedResponse | undefined {
  if (isFeed(data)) return data.id === feedId ? data : undefined;
  if (!isInfiniteFeedListData(data)) return undefined;

  for (const page of data.pages) {
    const feed = page.items.find((item) => item.id === feedId);
    if (feed) return feed;
  }

  return undefined;
}

function findFeedLocations(
  data: unknown,
  feedId: string,
): RemovedFeedLocation[] {
  if (!isInfiniteFeedListData(data)) return [];

  return data.pages.flatMap((page, pageIndex) =>
    page.items.flatMap((feed, itemIndex) =>
      feed.id === feedId ? [{ pageIndex, itemIndex, feed }] : [],
    ),
  );
}

function restoreFeedsToListCacheData(
  data: unknown,
  removedFeeds: RemovedFeedLocation[],
): unknown {
  if (!hasFeedListPages(data)) return data;

  let pages = data.pages;

  removedFeeds.forEach(({ pageIndex, itemIndex, feed }) => {
    if (pages.some((page) => page.items.some((item) => item.id === feed.id))) {
      return;
    }

    const page = pages[pageIndex];
    if (!page) return;

    const insertionIndex = Math.min(itemIndex, page.items.length);
    const items = [...page.items];
    items.splice(insertionIndex, 0, feed);
    pages = pages.map((currentPage, index) =>
      index === pageIndex ? { ...currentPage, items } : currentPage,
    );
  });

  return pages === data.pages ? data : { ...data, pages };
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

export function invalidateFeedCollectionQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: feedQueryKeys.lists(),
    }),
    queryClient.invalidateQueries({
      queryKey: userFeedQueryKeys.all,
    }),
  ]);
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

  const previousFeedCaches: FeedUpdateCacheSnapshot[] = matchingQueries.flatMap(
    (query) => {
      const previousFeed = findFeedInCacheData(
        queryClient.getQueryData(query.queryKey),
        feedId,
      );

      return previousFeed ? [{ queryKey: query.queryKey, previousFeed }] : [];
    },
  );

  previousFeedCaches.forEach(({ queryKey }) => {
    queryClient.setQueryData(queryKey, (data: unknown) =>
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

  const previousFeedCaches: RemovedFeedCacheSnapshot[] =
    matchingQueries.flatMap((query) => {
      const removedFeeds = findFeedLocations(
        queryClient.getQueryData(query.queryKey),
        feedId,
      );

      return removedFeeds.length > 0
        ? [{ queryKey: query.queryKey, removedFeeds }]
        : [];
    });

  previousFeedCaches.forEach(({ queryKey }) => {
    queryClient.setQueryData(queryKey, (data: unknown) =>
      removeFeedFromListCacheData(data, feedId),
    );
  });

  return previousFeedCaches;
}

export function rollbackFeedUpdates(
  queryClient: QueryClient,
  snapshot: FeedUpdateCacheSnapshot[] | undefined,
  restore: (current: FeedResponse, previous: FeedResponse) => FeedResponse,
) {
  snapshot?.forEach(({ queryKey, previousFeed }) => {
    queryClient.setQueryData(queryKey, (data: unknown) =>
      updateFeedInCacheData(data, previousFeed.id, (currentFeed) =>
        restore(currentFeed, previousFeed),
      ),
    );
  });
}

export function rollbackRemovedFeeds(
  queryClient: QueryClient,
  snapshot?: RemovedFeedCacheSnapshot[],
) {
  snapshot?.forEach(({ queryKey, removedFeeds }) => {
    queryClient.setQueryData(queryKey, (data: unknown) =>
      restoreFeedsToListCacheData(data, removedFeeds),
    );
  });
}
