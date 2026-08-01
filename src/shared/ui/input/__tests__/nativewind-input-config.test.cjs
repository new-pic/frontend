const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "../../../../../");

test("NativeWind v5 변환은 Babel preset을 중복 사용하지 않는다", () => {
  const babelConfig = fs.readFileSync(
    path.join(projectRoot, "babel.config.js"),
    "utf8",
  );
  const inputSource = fs.readFileSync(
    path.join(projectRoot, "src/shared/ui/input/index.tsx"),
    "utf8",
  );

  assert.doesNotMatch(babelConfig, /nativewind\/babel/);
  assert.doesNotMatch(inputSource, /use no memo/);
  assert.match(inputSource, /createInput/);
  assert.match(inputSource, /<UIInput\.Input/);
});
