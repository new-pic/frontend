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
  adaptDWPosePose,
  adaptMediaPipePose,
  capturePointToPreview,
  createCaptureCanvasSize,
  matchPoseScene,
  rawPointToCaptureNormalized,
} = require("../index.ts");

const IDENTITY_TRANSFORM = {
  sourceSize: { width: 400, height: 300 },
  captureSize: { width: 400, height: 300 },
  coordinateUnit: "normalized",
  rotationDegrees: 0,
  mirrorX: false,
  captureResizeMode: "cover",
};

function point(x, y, confidence = 1) {
  return { x, y, confidence };
}

function createPose() {
  return {
    joints: {
      NOSE: point(0.5, 0.2),
      LEFT_SHOULDER: point(0.4, 0.3),
      RIGHT_SHOULDER: point(0.6, 0.3),
      LEFT_ELBOW: point(0.35, 0.43),
      RIGHT_ELBOW: point(0.65, 0.43),
      LEFT_WRIST: point(0.3, 0.55),
      RIGHT_WRIST: point(0.7, 0.55),
      LEFT_HIP: point(0.44, 0.55),
      RIGHT_HIP: point(0.56, 0.55),
      LEFT_KNEE: point(0.44, 0.7),
      RIGHT_KNEE: point(0.56, 0.7),
      LEFT_ANKLE: point(0.44, 0.85),
      RIGHT_ANKLE: point(0.56, 0.85),
    },
  };
}

function mapPose(pose, mapper) {
  return {
    joints: Object.fromEntries(
      Object.entries(pose.joints).map(([joint, value]) => [
        joint,
        mapper(value, joint),
      ]),
    ),
  };
}

function translatePose(pose, dx, dy) {
  return mapPose(pose, (value) => ({
    ...value,
    x: value.x + dx,
    y: value.y + dy,
  }));
}

function scalePose(pose, scale, center = { x: 0.5, y: 0.5 }) {
  return mapPose(pose, (value) => ({
    ...value,
    x: center.x + (value.x - center.x) * scale,
    y: center.y + (value.y - center.y) * scale,
  }));
}

test("identical pose produces a high score", () => {
  const result = matchPoseScene([createPose()], [createPose()]);

  assert.equal(result.aligned, true);
  assert.equal(result.feedback, "ALIGNED");
  assert.ok(result.sceneScore > 99);
  assert.ok(result.assignments[0].match.score.pose > 99);
});

test("a live person shifted left receives MOVE_RIGHT correction", () => {
  const result = matchPoseScene(
    [createPose()],
    [translatePose(createPose(), -0.15, 0)],
  );

  assert.equal(result.aligned, false);
  assert.equal(result.feedback, "MOVE_RIGHT");
  assert.equal(result.largestMismatch, "POSITION");
});

test("a live person shifted right receives MOVE_LEFT correction", () => {
  const result = matchPoseScene(
    [createPose()],
    [translatePose(createPose(), 0.15, 0)],
  );

  assert.equal(result.feedback, "MOVE_LEFT");
});

test("a live person that is too large receives MOVE_FARTHER", () => {
  const result = matchPoseScene(
    [createPose()],
    [scalePose(createPose(), 1.35)],
  );

  assert.equal(result.feedback, "MOVE_FARTHER");
  assert.ok(result.assignments[0].match.metrics.scaleRatio > 1);
});

test("a live person that is too small receives MOVE_CLOSER", () => {
  const result = matchPoseScene(
    [createPose()],
    [scalePose(createPose(), 0.65)],
  );

  assert.equal(result.feedback, "MOVE_CLOSER");
  assert.ok(result.assignments[0].match.metrics.scaleRatio < 1);
});

test("a left-arm-only mismatch is localized", () => {
  const live = mapPose(createPose(), (value, joint) =>
    joint === "LEFT_ELBOW" || joint === "LEFT_WRIST"
      ? { ...value, y: 0.24 }
      : value,
  );
  const result = matchPoseScene([createPose()], [live]);

  assert.equal(result.aligned, false);
  assert.equal(result.feedback, "ADJUST_LEFT_ARM");
  assert.equal(result.largestMismatch, "LEFT_ARM");
});

test("two people are assigned by pose/location rather than array order", () => {
  const left = translatePose(createPose(), -0.18, 0);
  const right = translatePose(createPose(), 0.18, 0);
  const result = matchPoseScene([left, right], [right, left]);

  assert.equal(result.aligned, true);
  assert.deepEqual(
    result.assignments.map(({ targetIndex, liveIndex }) => ({
      targetIndex,
      liveIndex,
    })),
    [
      { targetIndex: 0, liveIndex: 1 },
      { targetIndex: 1, liveIndex: 0 },
    ],
  );
});

test("target two people and live one person reports count mismatch", () => {
  const target = [
    translatePose(createPose(), -0.18, 0),
    translatePose(createPose(), 0.18, 0),
  ];
  const result = matchPoseScene(target, [target[0]]);

  assert.equal(result.aligned, false);
  assert.equal(result.feedback, "PERSON_COUNT_MISMATCH");
  assert.equal(result.sceneScore, 0);
  assert.deepEqual(result.unmatchedTargetIndices, [1]);
});

test("low-confidence landmarks are excluded from pose error", () => {
  const live = mapPose(createPose(), (value, joint) =>
    joint === "LEFT_ELBOW"
      ? { x: 0.95, y: 0.05, confidence: 0.1 }
      : value,
  );
  const result = matchPoseScene([createPose()], [live]);

  assert.equal(result.aligned, true);
  assert.ok(result.sceneScore > 95);
  assert.equal(
    result.assignments[0].match.metrics.comparableJointCount,
    12,
  );
});

test("4:3 and 16:9 cover transforms map into capture coordinates", () => {
  const sourceSize = { width: 400, height: 300 };
  const rawPoint = point(0.25, 0.25);
  const fourByThree = rawPointToCaptureNormalized(rawPoint, {
    ...IDENTITY_TRANSFORM,
    captureSize: createCaptureCanvasSize("4:3", 1200),
  });
  const sixteenByNine = rawPointToCaptureNormalized(rawPoint, {
    ...IDENTITY_TRANSFORM,
    sourceSize,
    captureSize: createCaptureCanvasSize("16:9", 1600),
  });

  assert.ok(Math.abs(fourByThree.x - 0.25) < 1e-9);
  assert.ok(Math.abs(fourByThree.y - 0.25) < 1e-9);
  assert.ok(Math.abs(sixteenByNine.x - 0.25) < 1e-9);
  assert.ok(Math.abs(sixteenByNine.y - 1 / 6) < 1e-9);
});

test("device rotation and front-camera mirroring are capture transforms", () => {
  const transformed = rawPointToCaptureNormalized(point(0.2, 0.3), {
    ...IDENTITY_TRANSFORM,
    sourceSize: { width: 300, height: 400 },
    captureSize: { width: 400, height: 300 },
    rotationDegrees: 90,
    mirrorX: true,
  });

  assert.ok(Math.abs(transformed.x - 0.3) < 1e-9);
  assert.ok(Math.abs(transformed.y - 0.2) < 1e-9);
});

test("preview cover crop stays separate from capture matching", () => {
  const previewPoint = capturePointToPreview(point(0.25, 0.5), {
    captureSize: { width: 1600, height: 900 },
    previewSize: { width: 300, height: 400 },
    previewResizeMode: "cover",
    mirrorX: false,
  });

  assert.ok(Math.abs(previewPoint.x + 250 / 9) < 1e-9);
  assert.ok(Math.abs(previewPoint.y - 200) < 1e-9);
});

test("DWPose and MediaPipe adapters use their own verified mappings", () => {
  const dwpose = Array.from({ length: 17 }, (_, index) => ({
    index,
    x: index / 20,
    y: index / 20,
    visibility: 0.9,
  }));
  const mediapipe = Array.from({ length: 29 }, (_, index) => ({
    x: index / 40,
    y: index / 40,
    visibility: 0.8,
  }));
  const commonDWPose = adaptDWPosePose(dwpose, {
    keypointFormat: "dwpose_xy_score",
    coordinateTransform: IDENTITY_TRANSFORM,
  });
  const commonMediaPipe = adaptMediaPipePose(mediapipe, {
    coordinateTransform: IDENTITY_TRANSFORM,
  });

  assert.equal(commonDWPose.joints.LEFT_SHOULDER.x, 5 / 20);
  assert.equal(commonDWPose.joints.LEFT_HIP.x, 11 / 20);
  assert.equal(commonMediaPipe.joints.LEFT_SHOULDER.x, 11 / 40);
  assert.equal(commonMediaPipe.joints.LEFT_HIP.x, 23 / 40);
});
