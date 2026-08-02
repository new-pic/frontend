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
  FEED_DETAIL_BASE_COMMENT_BOTTOM_PADDING,
  FEED_DETAIL_GUIDE_FAB_EDGE_GAP,
  FEED_DETAIL_GUIDE_FAB_SIZE,
  getFeedDetailCommentBottomPadding,
  getFeedDetailGuideFabBottomOffset,
} = require("../model/feed-detail-layout.ts");

test("댓글 하단 여백은 FAB 높이의 절반과 safe area를 포함한다", () => {
  const safeAreaBottom = 34;

  assert.equal(
    getFeedDetailCommentBottomPadding(safeAreaBottom),
    FEED_DETAIL_BASE_COMMENT_BOTTOM_PADDING +
      FEED_DETAIL_GUIDE_FAB_SIZE / 2 +
      safeAreaBottom,
  );
});

test("FAB 하단 위치는 기본 간격과 safe area를 포함한다", () => {
  assert.equal(
    getFeedDetailGuideFabBottomOffset(34),
    FEED_DETAIL_GUIDE_FAB_EDGE_GAP + 34,
  );
  assert.equal(
    getFeedDetailGuideFabBottomOffset(-10),
    FEED_DETAIL_GUIDE_FAB_EDGE_GAP,
  );
});
