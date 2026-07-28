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
} = require("../lib/feed-guide-mask-adapter.ts");
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

test("operational background-removal DTO adapts to a guide mask", () => {
  assert.deepEqual(
    adaptFeedBackgroundRemoval({
      output: {
        success: true,
        result: {
          backgroundRemovedImage:
            "https://example.com/mask.png",
          imageWidth: 511,
          imageHeight: 1024,
          contours: [],
        },
      },
    }),
    {
      imageUrl: "https://example.com/mask.png",
      sourceSize: { width: 511, height: 1024 },
    },
  );
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

test("mask and target can become ready independently for one guide", () => {
  let state = cameraGuideReducer(INITIAL_CAMERA_GUIDE_STATE, {
    type: "SELECT",
    requestId: 3,
    selection: FEED_B,
  });
  state = cameraGuideReducer(state, {
    type: "MASK_READY",
    requestId: 3,
    selection: FEED_B,
    mask: {
      imageUrl: "https://example.com/b-mask.png",
      sourceSize: { width: 511, height: 1024 },
    },
  });

  assert.equal(state.active.mask.imageUrl.includes("b-mask"), true);
  assert.equal(state.active.target, null);

  state = cameraGuideReducer(state, {
    type: "TARGET_READY",
    requestId: 3,
    selection: FEED_B,
    sourceSize: { width: 736, height: 1475 },
    sourcePoses: [],
  });

  assert.equal(state.active.mask.imageUrl.includes("b-mask"), true);
  assert.deepEqual(state.active.target.sourcePoses, []);
  assert.equal(state.active.cameraAspectRatio, "16:9");
});

test("clearing a guide removes mask and target immediately", () => {
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
