const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const originalModuleLoad = Module._load;
Module._load = function mockQueryKeys(request, parent, isMain) {
  if (request === "@entities/feed/api/feed-query") {
    return { feedQueryKeys: { lists: ["feed", "list"] } };
  }
  if (request === "@entities/user/api/user-query") {
    return { userQueryKeys: { myFeeds: ["user", "me", "feeds"] } };
  }
  return originalModuleLoad.call(this, request, parent, isMain);
};
const {
  refreshPublishedFeedLists,
} = require("../lib/refresh-published-feed-lists.ts");
Module._load = originalModuleLoad;

test("게시 목록 갱신은 진행 중 요청을 취소하고 첫 페이지를 다시 조회한다", async () => {
  const calls = [];
  const queryClient = {
    resetQueries: async (...args) => {
      calls.push(args);
    },
  };

  await refreshPublishedFeedLists(queryClient);

  assert.deepEqual(calls, [
    [
      { queryKey: ["feed", "list"] },
      { cancelRefetch: true, throwOnError: true },
    ],
    [
      { queryKey: ["user", "me", "feeds"] },
      { cancelRefetch: true, throwOnError: true },
    ],
  ]);
});

test("자동 갱신은 같은 QueryClient에서 single-flight로 합친다", async () => {
  const resolvers = [];
  const queryClient = {
    resetQueries: () =>
      new Promise((resolve) => {
        resolvers.push(resolve);
      }),
  };

  const first = refreshPublishedFeedLists(queryClient);
  const second = refreshPublishedFeedLists(queryClient);
  assert.equal(first, second);

  await Promise.resolve();
  resolvers.forEach((resolve) => resolve());
  await first;
});

test("사용자 새로고침은 기존 single-flight와 별도의 최신 요청을 만든다", async () => {
  let resetCount = 0;
  const queryClient = {
    resetQueries: async () => {
      resetCount += 1;
    },
  };

  const automaticRefresh = refreshPublishedFeedLists(queryClient);
  const manualRefresh = refreshPublishedFeedLists(queryClient, { force: true });

  assert.notEqual(automaticRefresh, manualRefresh);
  await Promise.all([automaticRefresh, manualRefresh]);
  assert.equal(resetCount, 4);
});
