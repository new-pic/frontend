const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");
const { QueryClient } = require("@tanstack/react-query");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  optimisticallyRemoveFeedAcrossCollections,
  removeFeedFromListCacheData,
  rollbackFeedCaches,
  updateFeedInCacheData,
  updateFeedLists,
} = require("../api/feed-cache.ts");

function createFeed(overrides = {}) {
  return {
    id: "feed-1",
    shareSlug: "feed-1",
    description: "",
    tags: [],
    pickCount: 0,
    likeCount: 2,
    commentCount: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    author: {
      id: "user-1",
      nickname: "사용자",
      profileImage: "",
    },
    isLiked: false,
    isPicked: false,
    detailImageUrl: "https://example.com/detail.webp",
    thumbnailUrl: "https://example.com/thumb.webp",
    ...overrides,
  };
}

const likeFeed = (feed) => ({
  ...feed,
  isLiked: true,
  likeCount: feed.likeCount + 1,
});

const pickFeed = (feed) => ({
  ...feed,
  isPicked: true,
  pickCount: feed.pickCount + 1,
});

test("단일 피드 상세 cache의 좋아요 상태를 변경한다", () => {
  const updated = updateFeedInCacheData(createFeed(), "feed-1", likeFeed);

  assert.equal(updated.isLiked, true);
  assert.equal(updated.likeCount, 3);
});

test("public과 user 목록에서 사용하는 infinite cache를 동일하게 변경한다", () => {
  const cache = {
    pages: [
      {
        items: [createFeed(), createFeed({ id: "feed-2" })],
        nextCursor: null,
      },
    ],
    pageParams: [undefined],
  };

  const updated = updateFeedInCacheData(cache, "feed-1", likeFeed);

  assert.equal(updated.pages[0].items[0].isLiked, true);
  assert.equal(updated.pages[0].items[0].likeCount, 3);
  assert.equal(updated.pages[0].items[1], cache.pages[0].items[1]);
});

test("저장 상태와 저장 수도 모든 피드 collection cache에서 변경한다", () => {
  const cache = {
    pages: [
      {
        items: [createFeed({ pickCount: 4 })],
        nextCursor: null,
      },
    ],
    pageParams: [undefined],
  };

  const updated = updateFeedInCacheData(cache, "feed-1", pickFeed);

  assert.equal(updated.pages[0].items[0].isPicked, true);
  assert.equal(updated.pages[0].items[0].pickCount, 5);
});

test("피드 데이터가 아니거나 대상이 없으면 원래 참조를 유지한다", () => {
  const comments = {
    pages: [{ items: [{ id: "feed-1", content: "댓글" }] }],
  };
  const otherFeedCache = {
    pages: [{ items: [createFeed({ id: "feed-2" })] }],
  };

  assert.equal(updateFeedInCacheData(comments, "feed-1", likeFeed), comments);
  assert.equal(
    updateFeedInCacheData(otherFeedCache, "feed-1", likeFeed),
    otherFeedCache,
  );
});

test("성공이 확정된 피드만 지정한 collection 목록에서 제거한다", async () => {
  const queryClient = new QueryClient();
  const likedFeedListsKey = ["feed", "me", "liked-feeds"];
  const likedFeedListKey = [...likedFeedListsKey, "user-1", { take: 24 }];
  const publicFeedListKey = ["feed", "list", { take: 24 }];
  const cache = {
    pages: [{ items: [createFeed()], nextCursor: null }],
    pageParams: [undefined],
  };

  queryClient.setQueryData(likedFeedListKey, cache);
  queryClient.setQueryData(publicFeedListKey, cache);

  updateFeedLists(queryClient, likedFeedListsKey, (items) =>
    items.filter((feed) => feed.id !== "feed-1"),
  );

  assert.deepEqual(
    queryClient
      .getQueryData(likedFeedListKey)
      .pages.flatMap((page) => page.items),
    [],
  );
  assert.equal(
    queryClient.getQueryData(publicFeedListKey).pages[0].items[0].id,
    "feed-1",
  );
});

test("피드 삭제는 모든 collection에서 제거하고 실패 시 복구한다", async () => {
  const queryClient = new QueryClient();
  const queryKeys = [
    ["feed", "list", { take: 24 }],
    ["feed", "me", "feeds", "user-1", { take: 24 }],
    ["feed", "me", "liked-feeds", "user-1", { take: 24 }],
    ["feed", "me", "saved-feeds", "user-1", { take: 24 }],
  ];
  const cache = {
    pages: [{ items: [createFeed()], nextCursor: null }],
    pageParams: [undefined],
  };

  queryKeys.forEach((queryKey) => queryClient.setQueryData(queryKey, cache));
  queryClient.setQueryData(["feed", "item", "feed-1"], createFeed());

  const snapshot = await optimisticallyRemoveFeedAcrossCollections(
    queryClient,
    "feed-1",
  );

  queryKeys.forEach((queryKey) => {
    assert.deepEqual(
      queryClient.getQueryData(queryKey).pages.flatMap((page) => page.items),
      [],
    );
  });
  assert.equal(
    removeFeedFromListCacheData(
      queryClient.getQueryData(["feed", "item", "feed-1"]),
      "feed-1",
    ).id,
    "feed-1",
  );

  rollbackFeedCaches(queryClient, snapshot);

  queryKeys.forEach((queryKey) => {
    assert.equal(
      queryClient.getQueryData(queryKey).pages[0].items[0].id,
      "feed-1",
    );
  });
});
