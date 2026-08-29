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
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  DEFAULT_POSE_DETECTION_CONFIG,
  MAX_POSE_INFERENCE_FPS,
  MAX_POSE_COUNT,
  resolvePoseCount,
  resolvePoseDetectionConfig,
} = require("../pose-detection-config.ts");

test("unknown target count defaults to the four-person cap", () => {
  assert.equal(resolvePoseCount(), 4);
  assert.equal(MAX_POSE_COUNT, 4);
});

test("known target count is clamped to one through four", () => {
  assert.equal(resolvePoseCount(0), 1);
  assert.equal(resolvePoseCount(2), 2);
  assert.equal(resolvePoseCount(8), 4);
});

test("default inference calibration is 10 FPS and 640 pixels", () => {
  const config = resolvePoseDetectionConfig();
  assert.equal(config.maxInferenceFps, 10);
  assert.equal(config.maxInputLongEdge, 640);
  assert.equal(
    config.minPoseDetectionConfidence,
    DEFAULT_POSE_DETECTION_CONFIG.minPoseDetectionConfidence,
  );
});

test("caller-provided detection calibration is preserved", () => {
  assert.deepEqual(
    resolvePoseDetectionConfig({
      targetPersonCount: 3,
      maxInferenceFps: 8,
      maxInputLongEdge: 720,
      minPoseDetectionConfidence: 0.6,
      minPosePresenceConfidence: 0.7,
      minTrackingConfidence: 0.8,
    }),
    {
      numPoses: 3,
      maxInferenceFps: 8,
      maxInputLongEdge: 720,
      minPoseDetectionConfidence: 0.6,
      minPosePresenceConfidence: 0.7,
      minTrackingConfidence: 0.8,
    },
  );
});

test("inference FPS is clamped to the approved ten FPS cap", () => {
  assert.equal(
    resolvePoseDetectionConfig({ maxInferenceFps: 24 }).maxInferenceFps,
    MAX_POSE_INFERENCE_FPS,
  );
});
