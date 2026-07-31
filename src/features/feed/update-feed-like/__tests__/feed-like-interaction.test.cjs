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
  canToggleFeedLike,
  FEED_LIKE_THROTTLE_MS,
  getFeedLikeToggleResult,
} = require("../model/feed-like-interaction.ts");

test("현재 좋아요 상태에 따라 반대 동작을 선택한다", () => {
  assert.equal(getFeedLikeToggleResult(false), "LIKED");
  assert.equal(getFeedLikeToggleResult(true), "UNLIKED");
});

test("피드가 없거나 mutation 중이면 좋아요를 변경하지 않는다", () => {
  assert.equal(
    canToggleFeedLike({
      feedId: undefined,
      isPending: false,
      lastPressedAt: 0,
      now: 1_000,
    }),
    false,
  );
  assert.equal(
    canToggleFeedLike({
      feedId: "feed-1",
      isPending: true,
      lastPressedAt: 0,
      now: 1_000,
    }),
    false,
  );
});

test("버튼과 더블 탭에 공통 500ms throttle을 적용한다", () => {
  assert.equal(
    canToggleFeedLike({
      feedId: "feed-1",
      isPending: false,
      lastPressedAt: 1_000,
      now: 1_000 + FEED_LIKE_THROTTLE_MS,
    }),
    false,
  );
  assert.equal(
    canToggleFeedLike({
      feedId: "feed-1",
      isPending: false,
      lastPressedAt: 1_000,
      now: 1_001 + FEED_LIKE_THROTTLE_MS,
    }),
    true,
  );
});
