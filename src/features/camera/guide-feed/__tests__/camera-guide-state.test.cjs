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
  cameraGuideReducer,
  INITIAL_CAMERA_GUIDE_STATE,
} = require("../model/guide-state.ts");
const {
  adaptFeedBackgroundRemoval,
} = require("../lib/feed-guide-contour-adapter.ts");
const {
  adaptFeedToGuideSelection,
} = require("../lib/feed-guide-selection-adapter.ts");
const {
  createCameraGuideHref,
  createCameraGuidePath,
} = require("../model/camera-guide-navigation.ts");
const {
  createGuideContourPath,
  projectGuideOutlineToPreview,
} = require("../lib/guide-contour-projection.ts");
const {
  mapPoseFeedbackMessage,
} = require("../lib/pose-feedback-message.ts");
const {
  advancePoseGuideAlignmentPolicy,
  createPoseGuideAlignmentPolicyState,
  resetPoseGuideAlignmentPolicy,
  toPoseGuideAlignmentSnapshot,
} = require("../model/pose-guide-alignment-policy.ts");
const {
  DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
} = require("../model/pose-guide-feedback-config.ts");

const FEED_A = {
  feedId: "feed-a",
  thumbnailUrl: "https://example.com/a-thumb.webp",
  detailImageUrl: "https://example.com/a.webp",
};
const FEED_B = {
  feedId: "feed-b",
  thumbnailUrl: "https://example.com/b-thumb.webp",
  detailImageUrl: "https://example.com/b.webp",
};

test("피드 상세 FAB은 feedId만 Camera route contract로 전달한다", () => {
  assert.deepEqual(createCameraGuideHref(" feed-a "), {
    pathname: "/camera",
    params: {
      guideFeedId: "feed-a",
    },
  });
  assert.equal(
    createCameraGuidePath("feed/a"),
    "/camera?guideFeedId=feed%2Fa",
  );
});

test("Feed DTO는 Camera Guide selection 경계에서 필요한 필드만 남긴다", () => {
  assert.deepEqual(
    adaptFeedToGuideSelection({
      id: "feed-a",
      thumbnailUrl: "https://example.com/a-thumb.webp",
      detailImageUrl: "https://example.com/a.webp",
      description: "Camera domain에는 전달하지 않는 값",
    }),
    FEED_A,
  );
});

function createMatchResult({
  score,
  aligned,
  feedback,
  liveCenterX,
}) {
  const hasAssignment = liveCenterX !== undefined;
  return {
    aligned,
    sceneScore: score,
    feedback,
    assignments: hasAssignment
      ? [
          {
            targetIndex: 0,
            liveIndex: 1,
            score,
            match: {
              score: {
                overall: score,
                position: score,
                scale: score,
                pose: score,
              },
              isComparable: true,
              isAligned: aligned,
              metrics: {
                liveCenter: { x: liveCenterX, y: 0.5 },
              },
            },
          },
        ]
      : [],
    unmatchedTargetIndices: [],
    unmatchedLiveIndices: [],
    worstMatch: hasAssignment
      ? {
          targetIndex: 0,
          liveIndex: 1,
          score,
          cause: "POSITION",
        }
      : null,
    largestMismatch: aligned ? null : "POSITION",
  };
}

function observe(
  state,
  {
    score,
    aligned,
    feedback,
    nowMs,
    targetPersonCount = 1,
    livePersonCount = 1,
    liveCenterX,
  },
  config = DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
) {
  return advancePoseGuideAlignmentPolicy(
    state,
    {
      result: createMatchResult({
        score,
        aligned,
        feedback,
        liveCenterX,
      }),
      targetPersonCount,
      livePersonCount,
      nowMs,
    },
    config,
  );
}

test("background-removal DTO adapts normalized contours to a guide outline", () => {
  assert.deepEqual(
    adaptFeedBackgroundRemoval({
      output: {
        success: true,
        result: {
          backgroundRemovedImage:
            "https://example.com/mask.png",
          imageWidth: 511,
          imageHeight: 1024,
          contours: [
            {
              contourIndex: 0,
              closed: true,
              areaRatio: 0.3821,
              points: [
                { x: 0.1, y: 0.2 },
                { x: 0.8, y: 0.2 },
                { x: 0.5, y: 0.9 },
              ],
            },
          ],
        },
      },
    }),
    {
      sourceSize: { width: 511, height: 1024 },
      contours: [
        {
          contourIndex: 0,
          closed: true,
          areaRatio: 0.3821,
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.8, y: 0.2 },
            { x: 0.5, y: 0.9 },
          ],
        },
      ],
    },
  );
});

test("guide contour applies source cover directly to the preview", () => {
  const outline = {
    sourceSize: { width: 9, height: 16 },
    contours: [
      {
        contourIndex: 2,
        closed: true,
        areaRatio: 0.5,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    ],
  };
  const [projected] = projectGuideOutlineToPreview(outline, {
    width: 300,
    height: 400,
  });

  assert.equal(projected.points[0].x, 0);
  assert.ok(
    Math.abs(projected.points[0].y - -66.66666666666667) < 1e-9,
  );
  assert.equal(projected.points[1].x, 300);
  assert.ok(
    Math.abs(projected.points[1].y - -66.66666666666667) < 1e-9,
  );
  assert.equal(
    createGuideContourPath(projected),
    "M 0 -66.667 L 300 -66.667 L 300 466.667 Z",
  );
});

test("matching source and preview ratios map normalized contour points directly", () => {
  const outline = {
    sourceSize: { width: 576, height: 1024 },
    contours: [
      {
        contourIndex: 0,
        closed: true,
        areaRatio: 0.368974,
        points: [
          { x: 0.033333, y: 0.532292 },
          { x: 0.8, y: 0.2 },
        ],
      },
    ],
  };

  const [projected] = projectGuideOutlineToPreview(outline, {
    width: 324,
    height: 576,
  });

  assert.ok(Math.abs(projected.points[0].x - 10.799892) < 1e-9);
  assert.ok(Math.abs(projected.points[0].y - 306.600192) < 1e-9);
});

test("current guide remains active while the next selection is preparing", () => {
  let state = cameraGuideReducer(INITIAL_CAMERA_GUIDE_STATE, {
    type: "SELECT",
    requestId: 1,
    selection: FEED_A,
  });
  state = cameraGuideReducer(state, {
    type: "REFERENCE_READY",
    requestId: 1,
    selection: FEED_A,
    sourceSize: { width: 300, height: 400 },
  });
  state = cameraGuideReducer(state, {
    type: "SELECT",
    requestId: 2,
    selection: FEED_B,
  });

  assert.equal(state.selected.feedId, "feed-b");
  assert.equal(state.active.selection.feedId, "feed-a");
});

test("a stale response cannot replace the latest selected guide", () => {
  let state = cameraGuideReducer(INITIAL_CAMERA_GUIDE_STATE, {
    type: "SELECT",
    requestId: 1,
    selection: FEED_A,
  });
  state = cameraGuideReducer(state, {
    type: "SELECT",
    requestId: 2,
    selection: FEED_B,
  });
  state = cameraGuideReducer(state, {
    type: "REFERENCE_READY",
    requestId: 1,
    selection: FEED_A,
    sourceSize: { width: 300, height: 400 },
  });

  assert.equal(state.selected.feedId, "feed-b");
  assert.equal(state.active, null);
});

test("outline and target can become ready independently for one guide", () => {
  let state = cameraGuideReducer(INITIAL_CAMERA_GUIDE_STATE, {
    type: "SELECT",
    requestId: 3,
    selection: FEED_B,
  });
  state = cameraGuideReducer(state, {
    type: "OUTLINE_READY",
    requestId: 3,
    selection: FEED_B,
    outline: {
      sourceSize: { width: 511, height: 1024 },
      contours: [
        {
          contourIndex: 0,
          closed: true,
          areaRatio: 0.4,
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.9 },
          ],
        },
      ],
    },
  });

  assert.equal(state.active.outline.contours.length, 1);
  assert.equal(state.active.target, null);

  state = cameraGuideReducer(state, {
    type: "TARGET_READY",
    requestId: 3,
    selection: FEED_B,
    sourceSize: { width: 736, height: 1475 },
    sourcePoses: [],
  });

  assert.equal(state.active.outline.contours.length, 1);
  assert.deepEqual(state.active.target.sourcePoses, []);
  assert.equal(state.active.cameraAspectRatio, "16:9");
});

test("clearing a guide removes outline and target immediately", () => {
  let state = cameraGuideReducer(INITIAL_CAMERA_GUIDE_STATE, {
    type: "SELECT",
    requestId: 1,
    selection: FEED_A,
  });
  state = cameraGuideReducer(state, {
    type: "REFERENCE_READY",
    requestId: 1,
    selection: FEED_A,
    sourceSize: { width: 300, height: 400 },
  });
  state = cameraGuideReducer(state, {
    type: "CLEAR",
    requestId: 2,
  });

  assert.equal(state.selected, null);
  assert.equal(state.active, null);
});

test("alignment starts searching and waits for stable samples", () => {
  let state = createPoseGuideAlignmentPolicyState("feed-a", true);

  state = observe(state, {
    score: 100,
    aligned: true,
    feedback: "ALIGNED",
    nowMs: 0,
  });
  assert.equal(state.alignmentState, "SEARCHING");

  state = observe(state, {
    score: 100,
    aligned: true,
    feedback: "ALIGNED",
    nowMs: 100,
  });
  state = observe(state, {
    score: 100,
    aligned: true,
    feedback: "ALIGNED",
    nowMs: 200,
  });

  assert.equal(state.alignmentState, "ALIGNED");
  assert.equal(state.feedback, null);
  assert.equal(state.smoothedOverallScore, 100);
});

test("EMA smooths raw overall score with the configured alpha", () => {
  const config = {
    ...DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
    scoreEmaAlpha: 0.3,
    minimumStableSamples: 1,
  };
  let state = createPoseGuideAlignmentPolicyState("feed-a", true);
  state = observe(
    state,
    {
      score: 100,
      aligned: true,
      feedback: "ALIGNED",
      nowMs: 0,
    },
    config,
  );
  state = observe(
    state,
    {
      score: 50,
      aligned: false,
      feedback: "MOVE_RIGHT",
      nowMs: 100,
    },
    config,
  );

  assert.equal(state.smoothedOverallScore, 85);
  assert.equal(state.alignmentState, "ALIGNED");
});

test("warning and recovery thresholds apply hysteresis", () => {
  const config = {
    ...DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
    scoreEmaAlpha: 1,
    minimumStableSamples: 1,
    feedbackDebounceMs: 0,
    feedbackCooldownMs: 0,
  };
  let state = createPoseGuideAlignmentPolicyState("feed-a", true);
  state = observe(
    state,
    {
      score: 90,
      aligned: true,
      feedback: "ALIGNED",
      nowMs: 0,
    },
    config,
  );
  assert.equal(state.alignmentState, "ALIGNED");

  state = observe(
    state,
    {
      score: 80,
      aligned: false,
      feedback: "MOVE_RIGHT",
      nowMs: 100,
    },
    config,
  );
  assert.equal(state.alignmentState, "ALIGNED");

  state = observe(
    state,
    {
      score: 77,
      aligned: false,
      feedback: "MOVE_RIGHT",
      nowMs: 200,
    },
    config,
  );
  assert.equal(state.alignmentState, "MISALIGNED");

  state = observe(
    state,
    {
      score: 84,
      aligned: true,
      feedback: "ALIGNED",
      nowMs: 300,
    },
    config,
  );
  assert.equal(state.alignmentState, "MISALIGNED");

  state = observe(
    state,
    {
      score: 85,
      aligned: true,
      feedback: "ALIGNED",
      nowMs: 400,
    },
    config,
  );
  assert.equal(state.alignmentState, "ALIGNED");
});

test("a brief missing-person result stays in the previous UI state", () => {
  const config = {
    ...DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
    scoreEmaAlpha: 1,
    minimumStableSamples: 1,
    feedbackDebounceMs: 0,
  };
  let state = createPoseGuideAlignmentPolicyState("feed-a", true);
  state = observe(
    state,
    {
      score: 95,
      aligned: true,
      feedback: "ALIGNED",
      nowMs: 0,
    },
    config,
  );
  state = observe(
    state,
    {
      score: 0,
      aligned: false,
      feedback: "NO_PERSON",
      nowMs: 100,
      livePersonCount: 0,
    },
    config,
  );
  assert.equal(state.alignmentState, "ALIGNED");

  state = observe(
    state,
    {
      score: 0,
      aligned: false,
      feedback: "NO_PERSON",
      nowMs: 899,
      livePersonCount: 0,
    },
    config,
  );
  assert.equal(state.alignmentState, "ALIGNED");

  state = observe(
    state,
    {
      score: 0,
      aligned: false,
      feedback: "NO_PERSON",
      nowMs: 900,
      livePersonCount: 0,
    },
    config,
  );
  assert.equal(state.alignmentState, "SEARCHING");
  assert.equal(state.smoothedOverallScore, null);

  state = observe(
    state,
    {
      score: 0,
      aligned: false,
      feedback: "NO_PERSON",
      nowMs: 901,
      livePersonCount: 0,
    },
    config,
  );
  assert.equal(state.feedback.reason, "NO_PERSON");
});

test("feedback changes use debounce and cooldown", () => {
  const config = {
    ...DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
    scoreEmaAlpha: 1,
    minimumStableSamples: 1,
  };
  let state = createPoseGuideAlignmentPolicyState("feed-a", true);
  state = observe(
    state,
    {
      score: 40,
      aligned: false,
      feedback: "MOVE_RIGHT",
      nowMs: 0,
    },
    config,
  );
  assert.equal(state.feedback, null);

  state = observe(
    state,
    {
      score: 40,
      aligned: false,
      feedback: "MOVE_RIGHT",
      nowMs: 350,
    },
    config,
  );
  assert.equal(state.feedback.reason, "MOVE_RIGHT");

  state = observe(
    state,
    {
      score: 40,
      aligned: false,
      feedback: "MOVE_LEFT",
      nowMs: 500,
    },
    config,
  );
  state = observe(
    state,
    {
      score: 40,
      aligned: false,
      feedback: "MOVE_LEFT",
      nowMs: 900,
    },
    config,
  );
  assert.equal(state.feedback.reason, "MOVE_RIGHT");

  state = observe(
    state,
    {
      score: 40,
      aligned: false,
      feedback: "MOVE_LEFT",
      nowMs: 1150,
    },
    config,
  );
  assert.equal(state.feedback.reason, "MOVE_LEFT");
});

test("guide identity and readiness reset all feedback state", () => {
  const config = {
    ...DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
    scoreEmaAlpha: 1,
    minimumStableSamples: 1,
    feedbackDebounceMs: 0,
    feedbackCooldownMs: 0,
  };
  let state = createPoseGuideAlignmentPolicyState("feed-a", true);
  state = observe(
    state,
    {
      score: 40,
      aligned: false,
      feedback: "MOVE_RIGHT",
      nowMs: 0,
    },
    config,
  );
  state = observe(
    state,
    {
      score: 40,
      aligned: false,
      feedback: "MOVE_RIGHT",
      nowMs: 1,
    },
    config,
  );
  assert.equal(state.feedback.reason, "MOVE_RIGHT");

  state = resetPoseGuideAlignmentPolicy(
    state,
    "feed-b",
    false,
  );
  assert.deepEqual(toPoseGuideAlignmentSnapshot(state), {
    guideId: "feed-b",
    active: true,
    alignmentState: "SEARCHING",
    smoothedOverallScore: null,
    feedback: null,
  });

  state = resetPoseGuideAlignmentPolicy(state, null, false);
  assert.equal(state.active, false);
  assert.equal(state.alignmentState, null);
  assert.equal(state.feedback, null);
});

test("feedback message uses correction direction from the domain", () => {
  assert.equal(
    mapPoseFeedbackMessage({
      reason: "MOVE_RIGHT",
      personPosition: null,
      targetPersonCount: 1,
      livePersonCount: 1,
    }),
    "조금 오른쪽으로 이동해 주세요",
  );
  assert.equal(
    mapPoseFeedbackMessage({
      reason: "MOVE_LEFT",
      personPosition: null,
      targetPersonCount: 1,
      livePersonCount: 1,
    }),
    "조금 왼쪽으로 이동해 주세요",
  );
});

test("multi-person feedback labels the worst live assignment", () => {
  const config = {
    ...DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG,
    scoreEmaAlpha: 1,
    minimumStableSamples: 1,
    feedbackDebounceMs: 0,
    feedbackCooldownMs: 0,
  };
  let state = createPoseGuideAlignmentPolicyState("feed-a", true);
  state = observe(
    state,
    {
      score: 40,
      aligned: false,
      feedback: "MOVE_RIGHT",
      nowMs: 0,
      targetPersonCount: 2,
      livePersonCount: 2,
      liveCenterX: 0.2,
    },
    config,
  );
  state = observe(
    state,
    {
      score: 40,
      aligned: false,
      feedback: "MOVE_RIGHT",
      nowMs: 1,
      targetPersonCount: 2,
      livePersonCount: 2,
      liveCenterX: 0.2,
    },
    config,
  );

  assert.equal(state.feedback.personPosition, "LEFT");
  assert.equal(
    mapPoseFeedbackMessage(state.feedback),
    "왼쪽 사람이 조금 오른쪽으로 이동해 주세요",
  );
});

test("person-count feedback includes the target and live difference", () => {
  assert.equal(
    mapPoseFeedbackMessage({
      reason: "PERSON_COUNT_MISMATCH",
      personPosition: null,
      targetPersonCount: 3,
      livePersonCount: 1,
    }),
    "2명 더 화면에 들어와 주세요",
  );
  assert.equal(
    mapPoseFeedbackMessage({
      reason: "PERSON_COUNT_MISMATCH",
      personPosition: null,
      targetPersonCount: 2,
      livePersonCount: 3,
    }),
    "화면에 2명만 나오도록 조정해 주세요",
  );
});
