const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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
  resolveBottomSheetPresentation,
} = require("../bottom-sheet-presentation.ts");

const projectRoot = path.resolve(__dirname, "../../../../../");

test("일반 바텀시트는 요청한 snap point와 닫기 gesture를 유지한다", () => {
  const presentation = resolveBottomSheetPresentation({
    platform: "ios",
    snapPoints: ["40%", "80%"],
    isPanDownToCloseEnabled: true,
  });

  assert.deepEqual(presentation, {
    snapPoints: ["40%", "80%"],
    isPanDownToCloseEnabled: true,
  });
});

test("iOS 고정 바텀시트는 하나의 snap point만 사용한다", () => {
  const presentation = resolveBottomSheetPresentation({
    platform: "ios",
    snapPoints: ["50%", "100%"],
    lockedSnapPoint: "50%",
    isPanDownToCloseEnabled: true,
  });

  assert.deepEqual(presentation, {
    snapPoints: ["50%"],
    isPanDownToCloseEnabled: false,
  });
});

test("Android 고정 바텀시트는 native partial 상태에 고정된다", () => {
  const presentation = resolveBottomSheetPresentation({
    platform: "android",
    snapPoints: ["50%", "100%"],
    lockedSnapPoint: "50%",
    isPanDownToCloseEnabled: true,
  });

  assert.deepEqual(presentation, {
    snapPoints: ["50%", "100%"],
    isPanDownToCloseEnabled: false,
  });
});

test("RTC 참여 시트는 제목을 고정하고 keyboard 보정을 중복하지 않는다", () => {
  const source = fs.readFileSync(
    path.join(
      projectRoot,
      "src/features/rtc/join-room/ui/rtc-join-sheet.tsx",
    ),
    "utf8",
  );

  const headerIndex = source.indexOf("<RtcJoinFormHeader />");
  const scrollIndex = source.indexOf("<ScrollView");

  assert.match(source, /lockedSnapPoint="50%"/);
  assert.ok(headerIndex >= 0);
  assert.ok(scrollIndex > headerIndex);
  assert.match(source, /showHeader=\{false\}/);
  assert.doesNotMatch(source, /KeyboardAvoidingView/);
  assert.doesNotMatch(source, /automaticallyAdjustKeyboardInsets/);
});
