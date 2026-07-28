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
