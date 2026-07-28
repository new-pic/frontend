const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const commonResolutions = {
  UHD_4_3: { width: 3024, height: 4032 },
  UHD_16_9: { width: 2160, height: 3840 },
};
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "react-native-vision-camera") {
    return { CommonResolutions: commonResolutions };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  getEffectivePhotoFlashMode,
  getNextPhotoFlashMode,
  getPhotoTargetResolution,
  getPortraitPreviewAspectRatio,
  isResolutionMatchingAspectRatio,
} = require("../lib/camera-capture-settings.ts");

Module._load = originalLoad;

test("4:3 uses a portrait photo target and 3:4 preview geometry", () => {
  assert.deepEqual(
    getPhotoTargetResolution("4:3"),
    commonResolutions.UHD_4_3,
  );
  assert.equal(getPortraitPreviewAspectRatio("4:3"), 3 / 4);
});

test("16:9 uses a portrait photo target and 9:16 preview geometry", () => {
  assert.deepEqual(
    getPhotoTargetResolution("16:9"),
    commonResolutions.UHD_16_9,
  );
  assert.equal(getPortraitPreviewAspectRatio("16:9"), 9 / 16);
});

test("resolved resolution comparison is orientation independent", () => {
  assert.equal(
    isResolutionMatchingAspectRatio(
      { width: 4032, height: 3024 },
      "4:3",
    ),
    true,
  );
  assert.equal(
    isResolutionMatchingAspectRatio(
      { width: 1920, height: 1080 },
      "16:9",
    ),
    true,
  );
  assert.equal(
    isResolutionMatchingAspectRatio(
      { width: 4032, height: 3024 },
      "16:9",
    ),
    false,
  );
});

test("unsupported physical flash always resolves to off", () => {
  assert.equal(getEffectivePhotoFlashMode("on", false), "off");
  assert.equal(getEffectivePhotoFlashMode("auto", false), "off");
  assert.equal(getNextPhotoFlashMode("off", false), "off");
});

test("supported flash cycles off, on, and auto", () => {
  assert.equal(getNextPhotoFlashMode("off", true), "on");
  assert.equal(getNextPhotoFlashMode("on", true), "auto");
  assert.equal(getNextPhotoFlashMode("auto", true), "off");
});
