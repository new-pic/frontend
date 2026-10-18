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
  DEFAULT_APP_LANGUAGE,
  resolveAppLanguage,
} = require("../app-language.ts");
const { translate } = require("../translation-runtime.ts");

test("지원하는 첫 번째 기기 언어를 선택한다", () => {
  assert.equal(
    resolveAppLanguage([
      { languageCode: "fr" },
      { languageCode: "en" },
      { languageCode: "ko" },
    ]),
    "en",
  );
});

test("지역 코드와 무관하게 한국어와 영어를 정규화한다", () => {
  assert.equal(resolveAppLanguage([{ languageCode: "KO" }]), "ko");
  assert.equal(resolveAppLanguage([{ languageCode: "EN" }]), "en");
});

test("지원 언어가 없으면 한국어로 fallback한다", () => {
  assert.equal(
    resolveAppLanguage([{ languageCode: "ja" }]),
    DEFAULT_APP_LANGUAGE,
  );
  assert.equal(resolveAppLanguage([]), "ko");
});

test("React 밖의 번역 포트도 한국어와 영어 resource를 사용한다", () => {
  assert.equal(
    translate("feed.time.minutesAgo", { count: 3, lng: "ko" }),
    "3분 전",
  );
  assert.equal(
    translate("feed.time.minutesAgo", { count: 3, lng: "en-US" }),
    "3 min ago",
  );
});
