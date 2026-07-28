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
  orientCameraResolution,
} = require("../lib/camera-capture-settings.ts");
const {
  resolveFeedCameraAspectRatio,
} = require("../lib/feed-camera-aspect-ratio.ts");

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

test("sensor-native resolution follows the configured output orientation", () => {
  assert.deepEqual(
    orientCameraResolution(
      { width: 4032, height: 3024 },
      "right",
    ),
    { width: 3024, height: 4032 },
  );
  assert.deepEqual(
    orientCameraResolution(
      { width: 1920, height: 1080 },
      "up",
    ),
    { width: 1920, height: 1080 },
  );
});

test("following-feed mode chooses and locks the closest supported ratio", () => {
  assert.equal(
    resolveFeedCameraAspectRatio({ width: 1200, height: 1600 }),
    "4:3",
  );
  assert.equal(
    resolveFeedCameraAspectRatio({ width: 1080, height: 1920 }),
    "16:9",
  );
  assert.equal(
    resolveFeedCameraAspectRatio({ width: 2000, height: 3000 }),
    "4:3",
  );
});

test("feed ratio selection rejects missing image geometry", () => {
  assert.throws(
    () =>
      resolveFeedCameraAspectRatio({ width: 0, height: 0 }),
    /positive dimensions/,
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
