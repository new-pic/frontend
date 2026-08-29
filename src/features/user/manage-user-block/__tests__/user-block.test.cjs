const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
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

function isFeedAuthoredBy(data, userId) {
  return data?.author?.id === userId;
}

function removeItemsByAuthor(data, userId, readAuthorId) {
  if (!Array.isArray(data?.pages)) return data;

  let didRemove = false;
  const pages = data.pages.map((page) => {
    if (!Array.isArray(page?.items)) return page;
    const items = page.items.filter((item) => readAuthorId(item) !== userId);
    if (items.length === page.items.length) return page;
    didRemove = true;
    return { ...page, items };
  });

  return didRemove ? { ...data, pages } : data;
}

function removeFeedsByAuthorFromCacheData(data, userId) {
  return removeItemsByAuthor(data, userId, (feed) => feed.author?.id);
}

function removeCommentsByAuthorFromCacheData(data, userId) {
  return removeItemsByAuthor(data, userId, (comment) => comment.user?.id);
}

const originalLoad = Module._load;
Module._load = function loadWithEntityMocks(request, parent, isMain) {
  if (request === "@entities/feed") {
    return {
      feedQuery: {
        feedQueryKeys: {
          all: ["feed"],
          myFeeds: ["user", "my-feeds"],
          likedFeeds: ["user", "liked-feeds"],
          savedFeeds: ["user", "saved-feeds"],
        },
      },
      isFeedAuthoredBy,
      removeCommentsByAuthorFromCacheData,
      removeFeedsByAuthorFromCacheData,
    };
  }
  if (request === "@entities/user") {
    return {
      userBlockQuery: {
        userBlockQueryKeys: { all: ["user", "blocks"] },
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  hideBlockedUserContent,
  removeUnblockedUserFromListCache,
} = require("../model/blocked-user-cache.ts");
Module._load = originalLoad;

function readSource(relativePath) {
  return fs.readFileSync(require.resolve(relativePath), "utf8");
}

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

test("차단 성공 후 collection을 정리하고 작성자 feed item cache를 제거한다", async () => {
  const queryClient = new QueryClient();
  const feedListKey = ["feed", "list"];
  const commentListKey = ["feed", "comments", "feed-2"];
  const blockedFeedItemKey = ["feed", "item", "feed-1"];

  queryClient.setQueryData(
    feedListKey,
    createInfiniteData([
      createFeed("feed-1", "blocked-user"),
      createFeed("feed-2", "allowed-user"),
    ]),
  );
  queryClient.setQueryData(
    commentListKey,
    createInfiniteData([
      createComment("comment-1", "blocked-user"),
      createComment("comment-2", "allowed-user"),
    ]),
  );
  queryClient.setQueryData(
    blockedFeedItemKey,
    createFeed("feed-1", "blocked-user"),
  );

  await hideBlockedUserContent(queryClient, "blocked-user");

  assert.deepEqual(
    queryClient
      .getQueryData(feedListKey)
      .pages[0].items.map((feed) => feed.id),
    ["feed-2"],
  );
  assert.deepEqual(
    queryClient
      .getQueryData(commentListKey)
      .pages[0].items.map((comment) => comment.id),
    ["comment-2"],
  );
  assert.equal(queryClient.getQueryData(blockedFeedItemKey), undefined);
});

test("차단 해제 성공 후 차단 목록 cache에서 사용자 행을 제거한다", () => {
  const queryClient = new QueryClient();
  const blockedUsersKey = ["user", "blocks", { take: 20 }];
  queryClient.setQueryData(blockedUsersKey, {
    pages: [
      {
        items: [
          {
            id: "block-1",
            createdAt: "2026-08-01T00:00:00.000Z",
            blockedUser: {
              id: "blocked-user",
              nickname: "차단 사용자",
              profileImage: null,
            },
          },
        ],
        nextCursor: null,
      },
    ],
    pageParams: [undefined],
  });

  removeUnblockedUserFromListCache(queryClient, "blocked-user");

  assert.deepEqual(
    queryClient.getQueryData(blockedUsersKey).pages[0].items,
    [],
  );
});

test("차단 API와 인증된 댓글 조회 endpoint를 사용한다", () => {
  const blockQuerySource = readSource(
    "../../../../entities/user/api/user-block-query.ts",
  );
  const feedQuerySource = readSource(
    "../../../../entities/feed/api/feed-query.ts",
  );

  assert.match(blockQuerySource, /get\("\/users\/me\/blocks"/);
  assert.match(blockQuerySource, /post\(`\/users\/\$\{userId\}\/block`\)/);
  assert.match(blockQuerySource, /delete\(`\/users\/\$\{userId\}\/block`\)/);
  assert.match(
    feedQuerySource,
    /privateApiClient\.get\(`\/feed\/\$\{feedId\}\/comments`/,
  );
});

test("피드와 댓글 메뉴에 신고와 작성자 차단 action을 함께 제공한다", () => {
  const headerSource = readSource(
    "../../../../widgets/feed/detail/ui/feed-detail-header.tsx",
  );
  const commentsSource = readSource(
    "../../../../widgets/feed/detail/ui/feed-comments.tsx",
  );

  for (const source of [headerSource, commentsSource]) {
    assert.match(source, /label: "신고하기"/);
    assert.match(source, /label: "작성자 차단하기"/);
  }
});

test("프로필의 회원 전용 차단 목록에서 차단 해제를 제공한다", () => {
  const profileSource = readSource(
    "../../../../pages/profile/ui/profile-page.tsx",
  );
  const blockedUsersSource = readSource(
    "../../../../pages/profile/ui/profile-blocked-users-page.tsx",
  );

  assert.match(
    profileSource,
    /!isGuest[\s\S]*차단한 사용자[\s\S]*로그아웃/,
  );
  assert.match(blockedUsersSource, /useReadBlockedUsers/);
  assert.match(blockedUsersSource, /차단 해제/);
  assert.match(blockedUsersSource, /unblockUser/);
});

test("신고 성공은 콘텐츠 cache를 변경하지 않고 차단 성공만 숨김 처리한다", () => {
  const reportModalSource = readSource(
    "../../../feed/report-content/ui/report-content-modal.tsx",
  );
  const blockSource = readSource("../model/use-block-user.ts");

  assert.doesNotMatch(reportModalSource, /hideBlockedUserContent/);
  assert.match(
    blockSource,
    /await blockMutation\.mutateAsync\(userId\)[\s\S]*await hideBlockedUserContent\(queryClient, userId\)/,
  );
  assert.match(blockSource, /onBlocked\?\.\(\)/);
  assert.doesNotMatch(blockSource, /@shared\/hooks/);
  assert.match(blockSource, /useBlockUser\(\{ requireMember \}/);
});
