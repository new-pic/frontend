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

const { MOBILE_UI_METRICS } = require("../ui-metrics.ts");

test("공통 모바일 터치 영역은 iOS와 Android 권장 기준을 충족한다", () => {
  assert.ok(MOBILE_UI_METRICS.minimumTouchTarget >= 48);
  assert.ok(
    MOBILE_UI_METRICS.standardIconSize < MOBILE_UI_METRICS.minimumTouchTarget,
  );
});
