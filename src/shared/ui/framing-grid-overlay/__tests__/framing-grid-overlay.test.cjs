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

const { getFramingGridLinePercentages } = require("../framing-grid-layout.ts");

const projectRoot = path.resolve(__dirname, "../../../../../");

test("3분할 촬영 그리드는 1/3과 2/3 위치에 선을 만든다", () => {
  const percentages = getFramingGridLinePercentages();

  assert.equal(percentages.length, 2);
  assert.ok(Math.abs(percentages[0] - 100 / 3) < 1e-10);
  assert.ok(Math.abs(percentages[1] - (100 / 3) * 2) < 1e-10);
});

test("촬영자 그리드는 흰색 가이드보다 아래 레이어에 배치된다", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "src/pages/camera/ui/camera-page.tsx"),
    "utf8",
  );
  const guideSource = fs.readFileSync(
    path.join(
      projectRoot,
      "src/features/camera/guide-feed/ui/camera-guide-overlay.tsx",
    ),
    "utf8",
  );

  const gridIndex = source.indexOf("<FramingGridOverlay />");
  const referenceIndex = source.indexOf("<CameraGuideReferenceOverlay");
  const guideIndex = source.indexOf("<CameraGuideOverlay");

  assert.ok(gridIndex >= 0);
  assert.ok(referenceIndex > gridIndex);
  assert.ok(guideIndex > gridIndex);
  assert.match(guideSource, /GUIDE_OUTLINE_COLOR\s*=\s*"#FFFFFF"/);
});

test("참여자 영상은 전체 구도를 유지하고 그리드와 이모지 footer를 사용한다", () => {
  const liveKitSource = fs.readFileSync(
    path.join(
      projectRoot,
      "src/features/rtc/join-room/ui/rtc-viewer-livekit.tsx",
    ),
    "utf8",
  );
  const pickerSource = fs.readFileSync(
    path.join(
      projectRoot,
      "src/features/rtc/reactions/ui/rtc-viewer-reaction-picker.tsx",
    ),
    "utf8",
  );

  assert.match(liveKitSource, /objectFit="contain"/);
  assert.match(liveKitSource, /사진에 찍히는 내 모습/);
  assert.match(liveKitSource, /<FramingGridOverlay \/>/);
  assert.match(liveKitSource, /\{reactionPicker\}/);
  assert.doesNotMatch(liveKitSource, />\s*실시간 공유\s*</);
  assert.doesNotMatch(pickerSource, /position:\s*"absolute"/);
  assert.match(pickerSource, /useReadFeedbackEmojis/);
  assert.match(pickerSource, /useRtcReactionChannel/);
});
