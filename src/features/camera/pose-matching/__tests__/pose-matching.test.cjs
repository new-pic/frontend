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
  adaptDWPoseResult,
  adaptMediaPipePose,
  capturePointToPreview,
  createFeedPoseTargetPreparer,
  createCaptureCanvasSize,
  matchPoseScene,
  normalizeDWPosePeople,
  orientCoordinateSize,
  projectSourceCanvasToPreviewRect,
  projectDWPosePoseToCapture,
  projectMediaPipePoseToCapture,
} = require("../index.ts");

test("guide source composes through capture space before preview", () => {
  const rect = projectSourceCanvasToPreviewRect(
    { width: 3, height: 4 },
    {
      captureSize: { width: 3, height: 4 },
      previewSize: { width: 300, height: 400 },
      previewResizeMode: "cover",
      mirrorX: false,
    },
  );

  assert.deepEqual(rect, {
    x: 0,
    y: 0,
    width: 300,
    height: 400,
  });

  const cropped = projectSourceCanvasToPreviewRect(
    { width: 9, height: 16 },
    {
      captureSize: { width: 3, height: 4 },
      previewSize: { width: 300, height: 400 },
      previewResizeMode: "cover",
      mirrorX: false,
    },
  );
  assert.equal(cropped.width, 300);
  assert.ok(Math.abs(cropped.height - 533.3333333333333) < 1e-9);
  assert.equal(cropped.x, 0);
  assert.ok(Math.abs(cropped.y - -66.66666666666663) < 1e-9);
});

const IDENTITY_TRANSFORM = {
  sourceSize: { width: 400, height: 300 },
  captureSize: { width: 400, height: 300 },
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
  const sourcePose = {
    coordinateSpace: "dwpose_source_normalized",
    sourcePersonIndex: 0,
    joints: { NOSE: point(0.25, 0.25) },
  };
  const fourByThree = projectDWPosePoseToCapture(sourcePose, {
    ...IDENTITY_TRANSFORM,
    captureSize: createCaptureCanvasSize("4:3", 1200),
  }).joints.NOSE;
  const sixteenByNine = projectDWPosePoseToCapture(sourcePose, {
    ...IDENTITY_TRANSFORM,
    captureSize: createCaptureCanvasSize("16:9", 1600),
  }).joints.NOSE;

  assert.ok(Math.abs(fourByThree.x - 0.25) < 1e-9);
  assert.ok(Math.abs(fourByThree.y - 0.25) < 1e-9);
  assert.ok(Math.abs(sixteenByNine.x - 0.25) < 1e-9);
  assert.ok(Math.abs(sixteenByNine.y - 1 / 6) < 1e-9);
});

test("upright MediaPipe input is not rotated again and can be mirrored", () => {
  const transformed = projectMediaPipePoseToCapture(
    {
      coordinateSpace: "mediapipe_input_normalized",
      joints: { NOSE: point(0.2, 0.3) },
    },
    {
      inputSize: { width: 400, height: 300 },
      captureSize: { width: 400, height: 300 },
      captureResizeMode: "cover",
      mirrorX: true,
    },
  ).joints.NOSE;

  assert.ok(Math.abs(transformed.x - 0.8) < 1e-9);
  assert.ok(Math.abs(transformed.y - 0.3) < 1e-9);
});

test("capture canvas size supports portrait 4:3 and 16:9", () => {
  assert.deepEqual(
    createCaptureCanvasSize("4:3", 1200, "portrait"),
    { width: 900, height: 1200 },
  );
  assert.deepEqual(
    createCaptureCanvasSize("16:9", 1600, "portrait"),
    { width: 900, height: 1600 },
  );
});

test("sensor-native capture size follows output orientation", () => {
  assert.deepEqual(
    orientCoordinateSize({ width: 4032, height: 3024 }, 90),
    { width: 3024, height: 4032 },
  );
  assert.deepEqual(
    orientCoordinateSize({ width: 4032, height: 3024 }, 0),
    { width: 4032, height: 3024 },
  );
});

test("insufficient comparable confidence is explicit feedback", () => {
  const live = mapPose(createPose(), (value, joint) => ({
    ...value,
    confidence:
      joint === "NOSE" || joint === "LEFT_SHOULDER" ? 1 : 0,
  }));
  const result = matchPoseScene([createPose()], [live]);

  assert.equal(result.aligned, false);
  assert.equal(result.feedback, "LOW_CONFIDENCE");
  assert.equal(result.largestMismatch, "CONFIDENCE");
});

test("front-camera mirroring stays out of preview-only transforms", () => {
  const transformed = projectDWPosePoseToCapture(
    {
      coordinateSpace: "dwpose_source_normalized",
      sourcePersonIndex: 0,
      joints: { NOSE: point(0.2, 0.3) },
    },
    {
      ...IDENTITY_TRANSFORM,
      mirrorX: true,
    },
  ).joints.NOSE;

  assert.ok(Math.abs(transformed.x - 0.8) < 1e-9);
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
    confidence: 0.8,
  }));
  const commonDWPose = adaptDWPosePose({
    personIndex: 3,
    landmarks: dwpose,
  });
  const commonMediaPipe = adaptMediaPipePose(mediapipe);

  assert.equal(commonDWPose.sourcePersonIndex, 3);
  assert.equal(commonDWPose.joints.LEFT_SHOULDER.x, 5 / 20);
  assert.equal(commonDWPose.joints.LEFT_HIP.x, 11 / 20);
  assert.equal(commonMediaPipe.joints.LEFT_SHOULDER.x, 11 / 40);
  assert.equal(commonMediaPipe.joints.LEFT_HIP.x, 23 / 40);
  assert.equal(commonMediaPipe.joints.LEFT_HIP.confidence, 0.8);
});

function createNormalizedPoseResult(storageShape, people) {
  const normalizedPeople =
    storageShape === "single_person"
      ? people[0]?.landmarks ?? []
      : people;
  return {
    landmarks: normalizedPeople,
    analysis: {
      poseAnalyzed: people.length > 0,
      posePersonCount: people.length,
      rawPersonCount: people.length,
      keypointFormat: "dwpose_xy_score",
      keypointCountsPerPerson: people.map(
        ({ landmarks }) => landmarks.length,
      ),
      scoreCountsPerPerson: people.map(
        ({ landmarks }) =>
          landmarks.filter(
            ({ visibility }) => visibility !== undefined,
          ).length,
      ),
      averageScorePerPerson: people.map(() => 0.9),
      storageShape,
      truncatedToKeypoints: 33,
    },
  };
}

test("single-person server storage normalizes to one person", () => {
  const landmarks = Array.from({ length: 17 }, (_, index) => ({
    index,
    x: index / 20,
    y: index / 20,
    visibility: 0.9,
  }));
  const people = normalizeDWPosePeople(
    createNormalizedPoseResult("single_person", [
      { personIndex: 0, landmarks },
    ]),
  );

  assert.equal(people.length, 1);
  assert.equal(people[0].personIndex, 0);
  assert.equal(people[0].landmarks.length, 17);
});

test("multi-person server storage preserves each source person", () => {
  const makePerson = (personIndex, offset) => ({
    personIndex,
    landmarks: Array.from({ length: 17 }, (_, index) => ({
      index,
      x: (index + offset) / 40,
      y: index / 40,
      visibility: 0.9,
    })),
  });
  const result = createNormalizedPoseResult("multi_person", [
    makePerson(4, 0),
    makePerson(9, 2),
  ]);
  const poses = adaptDWPoseResult(result);

  assert.deepEqual(
    poses.map(({ sourcePersonIndex }) => sourcePersonIndex),
    [4, 9],
  );
});

test("server per-person metadata mismatch is rejected", () => {
  const result = createNormalizedPoseResult("multi_person", [
    {
      personIndex: 0,
      landmarks: [
        { index: 0, x: 0.5, y: 0.2, visibility: 0.9 },
      ],
    },
  ]);
  result.analysis.keypointCountsPerPerson = [2];

  assert.throws(
    () => normalizeDWPosePeople(result),
    /keypoint count does not match truncation analysis/,
  );
});

test("server raw keypoint diagnostics may exceed stored truncation", () => {
  const person = {
    personIndex: 0,
    landmarks: Array.from({ length: 33 }, (_, index) => ({
      index,
      x: index / 40,
      y: index / 40,
      visibility: 0.9,
    })),
  };
  const result = createNormalizedPoseResult("multi_person", [
    person,
  ]);
  result.analysis.keypointCountsPerPerson = [133];
  result.analysis.scoreCountsPerPerson = [133];

  assert.equal(normalizeDWPosePeople(result)[0].landmarks.length, 33);
});

test("missing DWPose visibility becomes zero confidence", () => {
  const pose = adaptDWPosePose({
    personIndex: 0,
    landmarks: [{ index: 0, x: 0.5, y: 0.2 }],
  });

  assert.equal(pose.joints.NOSE.confidence, 0);
});

function createFeedPoseResponse(feedId, imageUrl, offset = 0) {
  const poseResult = createNormalizedPoseResult("single_person", [
    {
      personIndex: 0,
      landmarks: Array.from({ length: 17 }, (_, index) => ({
        index,
        x: (index + offset) / 40,
        y: index / 40,
        visibility: 0.9,
      })),
    },
  ]);

  return {
    feedId,
    imageUrl,
    poseLandmarks: poseResult.landmarks,
    poseAnalysis: poseResult.analysis,
    poseUpdatedAt: "2026-07-29T00:00:00.000Z",
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("new Feed target commits only after image and pose are ready", async () => {
  const poseGate = deferred();
  const imageGate = deferred();
  const preparer = createFeedPoseTargetPreparer({
    loadPose: () => poseGate.promise,
    loadImage: () => imageGate.promise,
  });
  const preparation = preparer.prepare({
    feedId: "feed-a",
    imageUrl: "https://example.com/feed-a.webp",
  });

  assert.equal(preparer.getActiveTarget(), null);
  poseGate.resolve(
    createFeedPoseResponse(
      "feed-a",
      "https://example.com/feed-a.webp",
    ),
  );
  await Promise.resolve();
  assert.equal(preparer.getActiveTarget(), null);

  imageGate.resolve({
    image: { key: "feed-a-image" },
    size: { width: 1200, height: 1600 },
  });
  const result = await preparation;

  assert.equal(result.status, "committed");
  assert.equal(result.target.cameraAspectRatio, "4:3");
  assert.equal(preparer.getActiveTarget().feedId, "feed-a");
});

test("late Feed preparation cannot replace the latest selection", async () => {
  const slowPose = deferred();
  const preparer = createFeedPoseTargetPreparer({
    loadPose: (feedId) =>
      feedId === "feed-b"
        ? slowPose.promise
        : Promise.resolve(
            createFeedPoseResponse(
              feedId,
              `https://example.com/${feedId}.webp`,
            ),
          ),
    loadImage: (imageUrl) =>
      Promise.resolve({
        image: { imageUrl },
        size: { width: 1080, height: 1920 },
      }),
  });
  const slowPreparation = preparer.prepare({
    feedId: "feed-b",
    imageUrl: "https://example.com/feed-b.webp",
  });
  const latestPreparation = preparer.prepare({
    feedId: "feed-c",
    imageUrl: "https://example.com/feed-c.webp",
  });

  const latestResult = await latestPreparation;
  slowPose.resolve(
    createFeedPoseResponse(
      "feed-b",
      "https://example.com/feed-b.webp",
    ),
  );
  const slowResult = await slowPreparation;

  assert.equal(latestResult.status, "committed");
  assert.equal(latestResult.target.cameraAspectRatio, "16:9");
  assert.equal(slowResult.status, "stale");
  assert.equal(preparer.getActiveTarget().feedId, "feed-c");
});

test("failed next Feed preparation keeps the current target", async () => {
  const preparer = createFeedPoseTargetPreparer({
    loadPose: (feedId) =>
      feedId === "feed-error"
        ? Promise.reject(new Error("pose unavailable"))
        : Promise.resolve(
            createFeedPoseResponse(
              feedId,
              `https://example.com/${feedId}.webp`,
            ),
          ),
    loadImage: (imageUrl) =>
      Promise.resolve({
        image: { imageUrl },
        size: { width: 1200, height: 1600 },
      }),
  });

  await preparer.prepare({
    feedId: "feed-a",
    imageUrl: "https://example.com/feed-a.webp",
  });
  await assert.rejects(
    preparer.prepare({
      feedId: "feed-error",
      imageUrl: "https://example.com/feed-error.webp",
    }),
    /pose unavailable/,
  );

  assert.equal(preparer.getActiveTarget().feedId, "feed-a");
});
