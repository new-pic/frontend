const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

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
  isFeedAuthoredBy,
  removeCommentsByAuthorFromCacheData,
  removeFeedsByAuthorFromCacheData,
} = require("../api/feed-cache.ts");

function createFeed(id, authorId) {
  return {
    id,
    shareSlug: id,
    description: "",
    tags: [],
    pickCount: 0,
    likeCount: 0,
    commentCount: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    author: {
      id: authorId,
      nickname: authorId,
      profileImage: "",
    },
    isLiked: false,
    isPicked: false,
    detailImageUrl: "https://example.com/detail.webp",
    thumbnailUrl: "https://example.com/thumb.webp",
  };
}

function createComment(id, authorId) {
  return {
    id,
    content: "댓글",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    user: {
      id: authorId,
      nickname: authorId,
      profileImage: "",
    },
  };
}

function createInfiniteData(items) {
  return {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  };
}

test("차단 사용자 작성 피드를 모든 collection page에서 제거한다", () => {
  const data = {
    pages: [
      {
        items: [
          createFeed("feed-1", "blocked-user"),
          createFeed("feed-2", "allowed-user"),
        ],
        nextCursor: "next",
      },
      {
        items: [createFeed("feed-3", "blocked-user")],
        nextCursor: null,
      },
    ],
    pageParams: [undefined, "next"],
  };

  const result = removeFeedsByAuthorFromCacheData(data, "blocked-user");

  assert.deepEqual(
    result.pages.flatMap((page) => page.items.map((feed) => feed.id)),
    ["feed-2"],
  );
  assert.equal(
    isFeedAuthoredBy(createFeed("feed-1", "blocked-user"), "blocked-user"),
    true,
  );
});

test("차단 사용자 작성 댓글만 정렬별 cache에서 제거한다", () => {
  const data = createInfiniteData([
    createComment("comment-1", "blocked-user"),
    createComment("comment-2", "allowed-user"),
  ]);

  const result = removeCommentsByAuthorFromCacheData(data, "blocked-user");

  assert.deepEqual(
    result.pages[0].items.map((comment) => comment.id),
    ["comment-2"],
  );
});

test("차단 대상 콘텐츠가 없으면 기존 cache 참조를 유지한다", () => {
  const feeds = createInfiniteData([createFeed("feed-1", "allowed-user")]);
  const comments = createInfiniteData([
    createComment("comment-1", "allowed-user"),
  ]);

  assert.equal(removeFeedsByAuthorFromCacheData(feeds, "blocked-user"), feeds);
  assert.equal(
    removeCommentsByAuthorFromCacheData(comments, "blocked-user"),
    comments,
  );
});
