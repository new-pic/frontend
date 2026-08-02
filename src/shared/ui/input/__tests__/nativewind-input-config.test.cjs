const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "../../../../../");

test("Gluestack Input은 NativeWind v5 Metro 변환 경계를 유지한다", () => {
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

test("react-native-css의 true nativeStyleMapping을 실제 prop 경로로 보정한다", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
  );
  const dependencyPatch = fs.readFileSync(
    path.join(projectRoot, "patches/react-native-css@3.0.7.patch"),
    "utf8",
  );

  assert.equal(
    packageJson.pnpm?.patchedDependencies?.["react-native-css@3.0.7"],
    "patches/react-native-css@3.0.7.patch",
  );
  assert.match(
    dependencyPatch,
    /\(path === true \? key : path\)\.split\("\."\)/,
  );
});
