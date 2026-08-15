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
  CONTENT_ACTION_MENU_EDGE_INSET,
  CONTENT_ACTION_MENU_TRIGGER_GAP,
  getContentActionMenuTop,
} = require("../model/content-action-menu-layout.ts");

test("아래 공간이 충분하면 메뉴를 trigger 아래에 배치한다", () => {
  assert.equal(
    getContentActionMenuTop({
      triggerY: 100,
      triggerHeight: 40,
      menuHeight: 96,
      windowHeight: 800,
    }),
    100 + 40 + CONTENT_ACTION_MENU_TRIGGER_GAP,
  );
});

test("아래 공간이 부족하면 메뉴를 trigger 위에 배치한다", () => {
  assert.equal(
    getContentActionMenuTop({
      triggerY: 730,
      triggerHeight: 40,
      menuHeight: 96,
      windowHeight: 800,
    }),
    730 - CONTENT_ACTION_MENU_TRIGGER_GAP - 96,
  );
});

test("위아래 공간이 모두 부족하면 메뉴를 화면 상단 여백에 맞춘다", () => {
  assert.equal(
    getContentActionMenuTop({
      triggerY: 40,
      triggerHeight: 40,
      menuHeight: 140,
      windowHeight: 160,
    }),
    CONTENT_ACTION_MENU_EDGE_INSET,
  );
});
