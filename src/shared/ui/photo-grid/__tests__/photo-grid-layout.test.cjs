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
  calculatePhotoGridItemWidth,
  resolvePhotoGridContentState,
} = require("../photo-grid-layout.ts");

test("초기 pending 상태는 빈 목록보다 우선한다", () => {
  assert.equal(
    resolvePhotoGridContentState({
      isPending: true,
      itemCount: 0,
    }),
    "pending",
  );
});

test("조회가 끝난 빈 목록만 empty 상태가 된다", () => {
  assert.equal(
    resolvePhotoGridContentState({
      isPending: false,
      itemCount: 0,
    }),
    "empty",
  );
  assert.equal(
    resolvePhotoGridContentState({
      isPending: false,
      itemCount: 1,
    }),
    "content",
  );
});

test("그리드 너비에서 열 사이 gap을 제외해 아이템 너비를 계산한다", () => {
  assert.equal(calculatePhotoGridItemWidth(320, 3, 1), 106);
  assert.equal(calculatePhotoGridItemWidth(390, 3, 1), 388 / 3);
});
