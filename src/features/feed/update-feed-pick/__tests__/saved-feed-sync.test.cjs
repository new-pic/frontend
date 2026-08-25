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
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const savedFeedsKey = [["user"], "user", "me", "saved-feeds"];
let fetchCount = 0;
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "@entities/feed") {
    return {
      feedQuery: {
        feedQueryKeys: {
          savedFeeds: savedFeedsKey,
        },
        savedFeedsInfiniteQueryOptions: ({ take }) => ({
          queryKey: [...savedFeedsKey, { take }],
          queryFn: async () => {
            fetchCount += 1;
            return {
              items: [{ id: "newly-saved-feed" }],
              nextCursor: null,
            };
          },
          initialPageParam: undefined,
          getNextPageParam: (lastPage) =>
            lastPage.nextCursor ?? undefined,
        }),
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  refreshSavedFeedGuideCache,
} = require("../lib/refresh-saved-feed-guide-cache.ts");

Module._load = originalLoad;

test("저장 성공 후 기존 Infinite cache를 버리고 첫 페이지를 다시 준비한다", async () => {
  fetchCount = 0;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const canonicalKey = [...savedFeedsKey, { take: 24 }];
  queryClient.setQueryData(canonicalKey, {
    pages: [
      {
        items: [{ id: "stale-feed" }],
        nextCursor: "stale-cursor",
      },
    ],
    pageParams: [undefined],
  });

  await refreshSavedFeedGuideCache(queryClient);

  const refreshed = queryClient.getQueryData(canonicalKey);
  assert.equal(fetchCount, 1);
  assert.deepEqual(
    refreshed.pages.flatMap((page) =>
      page.items.map(({ id }) => id),
    ),
    ["newly-saved-feed"],
  );
  assert.deepEqual(refreshed.pageParams, [undefined]);
});
