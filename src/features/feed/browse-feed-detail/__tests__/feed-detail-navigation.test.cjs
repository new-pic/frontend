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
  createFeedDetailHref,
  findFeedDetailInitialIndex,
  parseFeedDetailSource,
} = require("../model/feed-detail-navigation.ts");

test("source가 없는 기존 상세 링크는 public 목록을 사용한다", () => {
  assert.equal(parseFeedDetailSource(undefined), "public");
  assert.equal(parseFeedDetailSource("saved"), "saved");
  assert.equal(parseFeedDetailSource(["liked"]), "liked");
  assert.equal(parseFeedDetailSource("unknown"), null);
});

test("상세 링크에는 서버 데이터 대신 목록 출처와 위치만 직렬화한다", () => {
  assert.deepEqual(
    createFeedDetailHref({
      feedId: "feed-2",
      index: 1,
      source: "mine",
      take: 24,
    }),
    {
      pathname: "/feed/[id]",
      params: {
        id: "feed-2",
        index: "1",
        source: "mine",
        take: "24",
        q: undefined,
        tag: undefined,
      },
    },
  );
});

test("요청 index가 다르면 feedId를 기준으로 초기 위치를 복구한다", () => {
  const feeds = [{ id: "feed-1" }, { id: "feed-2" }];

  assert.equal(findFeedDetailInitialIndex(feeds, "feed-2", 0), 1);
  assert.equal(findFeedDetailInitialIndex(feeds, "feed-2", 1), 1);
  assert.equal(findFeedDetailInitialIndex(feeds, "missing", 10), 0);
});
