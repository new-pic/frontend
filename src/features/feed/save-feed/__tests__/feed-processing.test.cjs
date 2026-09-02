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

const {
  createSseParser,
} = require("../../../../entities/feed/api/sse-parser.ts");
const { parseFeedAiJobEvent } = require("../api/feed-ai-job-event.ts");
const {
  adaptCreatedFeedAiJob,
  adaptFeedAiJobStatus,
} = require("../model/processing/feed-ai-job-adapter.ts");
const {
  useFeedProcessingStore,
} = require("../model/processing/feed-processing-store.ts");
const {
  createFeedProcessingProgressProjection,
  projectFeedProcessingProgress,
  rebaseFeedProcessingProgressProjection,
} = require("../model/processing/feed-processing-progress.ts");

let getStatusImpl;
let subscribeEventsImpl;
const originalModuleLoad = Module._load;
Module._load = function mockFeedAiJobClient(request, parent, isMain) {
  if (request === "../../api/feed-ai-job-client") {
    return {
      getFeedAiJobStatus: (...args) => getStatusImpl(...args),
      subscribeFeedAiJobEvents: (...args) => subscribeEventsImpl(...args),
    };
  }
  return originalModuleLoad.call(this, request, parent, isMain);
};
const {
  monitorFeedAiJob,
} = require("../model/processing/feed-ai-job-monitor.ts");
Module._load = originalModuleLoad;

const processingStatus = {
  status: "PROCESSING",
  progressPercent: 20,
  isCompleted: false,
};

const completedStatus = {
  status: "COMPLETED",
  progressPercent: 100,
  isCompleted: true,
};

test("분할된 SSE chunk와 CRLF를 하나의 progress event로 조립한다", () => {
  const messages = [];
  const parser = createSseParser((message) => messages.push(message));

  parser.push('event: progress\r\ndata: {"jobId":"job-1",');
  parser.push(
    '"status":"PROCESSING","progressPercent":55,' +
      '"estimatedRemainingSeconds":54,"isCompleted":false}\r\n\r\n',
  );
  parser.finish();

  assert.equal(messages.length, 1);
  assert.deepEqual(parseFeedAiJobEvent(messages[0]), {
    type: "progress",
    data: {
      jobId: "job-1",
      status: "PROCESSING",
      progressPercent: 55,
      estimatedRemainingSeconds: 54,
      isCompleted: false,
    },
  });
});

test("payload가 정의되지 않은 completed와 failed는 event 이름으로 판별한다", () => {
  const messages = [];
  const parser = createSseParser((message) => messages.push(message));

  parser.push("event: completed\n\n");
  parser.push("event: failed\ndata: {}\n\n");
  parser.finish();

  assert.deepEqual(messages.map(parseFeedAiJobEvent), [
    { type: "completed" },
    { type: "failed" },
  ]);
});

test("알 수 없는 event와 잘못된 progress payload는 무시한다", () => {
  assert.equal(parseFeedAiJobEvent({ event: "heartbeat", data: "{}" }), null);
  assert.equal(
    parseFeedAiJobEvent({
      event: "progress",
      data: '{"progressPercent":50}',
    }),
    null,
  );
});

test("SSE가 terminal event 없이 실패하면 status polling으로 완료를 확인한다", async () => {
  const statuses = [processingStatus, completedStatus];
  const monitoringStates = [];
  const receivedStatuses = [];
  getStatusImpl = async () => statuses.shift();
  subscribeEventsImpl = async () => {
    throw new Error("stream disconnected");
  };

  const result = await monitorFeedAiJob({
    jobId: "job-1",
    signal: new AbortController().signal,
    onStatusSnapshot: (status) => receivedStatuses.push(status.status),
    onProgressEvent: () => {},
    onMonitoringStateChange: (state) => monitoringStates.push(state),
  });

  assert.equal(result, "completed");
  assert.deepEqual(receivedStatuses, ["PROCESSING", "COMPLETED"]);
  assert.deepEqual(monitoringStates, ["connecting", "disconnected", "polling"]);
});

test("SSE terminal event는 polling 없이 모니터링을 완료한다", async () => {
  const monitoringStates = [];
  let statusRequestCount = 0;
  getStatusImpl = async () => {
    statusRequestCount += 1;
    return processingStatus;
  };
  subscribeEventsImpl = async ({ onOpen, onEvent }) => {
    onOpen();
    onEvent({ type: "completed" });
  };

  const result = await monitorFeedAiJob({
    jobId: "job-1",
    signal: new AbortController().signal,
    onStatusSnapshot: () => {},
    onProgressEvent: () => {},
    onMonitoringStateChange: (state) => monitoringStates.push(state),
  });

  assert.equal(result, "completed");
  assert.equal(statusRequestCount, 1);
  assert.deepEqual(monitoringStates, ["connecting", "streaming"]);
});

test("생성 응답을 processing domain으로 변환하고 진행률을 보정한다", () => {
  assert.deepEqual(
    adaptCreatedFeedAiJob({
      jobId: "job-1",
      feedId: "feed-1",
      status: "QUEUED",
      progressPercent: -5,
      estimatedRemainingSeconds: 60,
      estimatedCompletedAt: "2026-07-29T12:00:00.000Z",
      isCompleted: false,
    }),
    {
      jobId: "job-1",
      feedId: "feed-1",
      processingPhase: "processing",
      serverProgressPercent: 0,
      estimatedRemainingSeconds: 60,
      monitoringState: "idle",
      feedListSyncState: "idle",
    },
  );
});

test("status enum을 completed/failed domain으로 분리한다", () => {
  assert.deepEqual(
    adaptFeedAiJobStatus({
      status: "COMPLETED",
      progressPercent: 101,
      isCompleted: true,
    }),
    { processingPhase: "completed", serverProgressPercent: 100 },
  );
  assert.deepEqual(
    adaptFeedAiJobStatus({
      status: "FAILED",
      progressPercent: 73,
      isCompleted: true,
    }),
    { processingPhase: "failed", serverProgressPercent: 73 },
  );
});

test("SSE가 없어도 예상 잔여 시간에 따라 95%까지 증가한다", () => {
  const projection = createFeedProcessingProgressProjection(
    {
      serverProgressPercent: 20,
      estimatedRemainingSeconds: 100,
      progressSnapshotReceivedAtMs: 1_000,
    },
    1_000,
  );

  assert.equal(projectFeedProcessingProgress(projection, 51_000), 57.5);
  assert.equal(projectFeedProcessingProgress(projection, 101_000), 95);
  assert.equal(projectFeedProcessingProgress(projection, 201_000), 95);
});

test("표시값보다 낮은 SSE는 역행시키지 않고 새 잔여 시간만 반영한다", () => {
  const initial = createFeedProcessingProgressProjection(
    {
      serverProgressPercent: 60,
      estimatedRemainingSeconds: 40,
      progressSnapshotReceivedAtMs: 0,
    },
    0,
  );
  const displayBeforeSse = projectFeedProcessingProgress(initial, 10_000);
  const rebased = rebaseFeedProcessingProgressProjection(
    initial,
    {
      serverProgressPercent: 50,
      estimatedRemainingSeconds: 60,
      progressSnapshotReceivedAtMs: 10_000,
    },
    10_000,
  );

  assert.equal(displayBeforeSse, 68.75);
  assert.equal(projectFeedProcessingProgress(rebased, 10_000), 68.75);
  assert.equal(projectFeedProcessingProgress(rebased, 70_000), 95);
});

test("높은 서버 진행률은 즉시 반영하되 완료 전에는 100%가 되지 않는다", () => {
  const initial = createFeedProcessingProgressProjection(
    {
      serverProgressPercent: 20,
      estimatedRemainingSeconds: 100,
      progressSnapshotReceivedAtMs: 0,
    },
    0,
  );
  const rebased = rebaseFeedProcessingProgressProjection(
    initial,
    {
      serverProgressPercent: 98,
      estimatedRemainingSeconds: 20,
      progressSnapshotReceivedAtMs: 5_000,
    },
    5_000,
  );
  const serverReportedComplete = createFeedProcessingProgressProjection(
    { serverProgressPercent: 100 },
    5_000,
  );

  assert.equal(projectFeedProcessingProgress(rebased, 5_000), 98);
  assert.equal(projectFeedProcessingProgress(rebased, 25_000), 98);
  assert.equal(
    projectFeedProcessingProgress(serverReportedComplete, 5_000),
    99,
  );
});

test("store는 현재 jobId의 update만 적용한다", () => {
  useFeedProcessingStore.getState().startProcessing({
    jobId: "job-current",
    feedId: "feed-current",
    status: "PROCESSING",
    progressPercent: 10,
    estimatedRemainingSeconds: 90,
    estimatedCompletedAt: "2026-07-29T12:00:00.000Z",
    isCompleted: false,
  });

  useFeedProcessingStore.getState().applyStatusSnapshot("job-old", {
    status: "COMPLETED",
    progressPercent: 100,
    isCompleted: true,
  });
  assert.equal(
    useFeedProcessingStore.getState().processingLifecycle.serverProgressPercent,
    10,
  );

  useFeedProcessingStore.getState().applyStatusSnapshot("job-current", {
    status: "PROCESSING",
    progressPercent: 62,
    isCompleted: false,
  });
  assert.equal(
    useFeedProcessingStore.getState().processingLifecycle.serverProgressPercent,
    62,
  );

  const progressEstimateObservedAfter = Date.now();
  useFeedProcessingStore.getState().applyProgressEvent("job-current", {
    jobId: "job-current",
    status: "PROCESSING",
    progressPercent: 50,
    estimatedRemainingSeconds: 120,
    isCompleted: false,
  });
  assert.equal(
    useFeedProcessingStore.getState().processingLifecycle.serverProgressPercent,
    50,
  );
  assert.equal(
    useFeedProcessingStore.getState().processingLifecycle
      .estimatedRemainingSeconds,
    120,
  );
  assert.ok(
    useFeedProcessingStore.getState().processingLifecycle
      .progressSnapshotReceivedAtMs >= progressEstimateObservedAfter,
  );

  useFeedProcessingStore.getState().dismissProcessing();
});
