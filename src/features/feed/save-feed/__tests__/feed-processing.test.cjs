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
  createSseParser,
} = require("../../../../entities/feed/api/sse-parser.ts");
const { parseFeedAiJobEvent } = require("../api/feed-ai-job-event.ts");
const {
  adaptCreatedFeedAiJob,
  adaptFeedAiJobStatus,
} = require("../lib/feed-ai-job-adapter.ts");
const { useFeedProcessingStore } = require("../model/feed-processing-store.ts");
const {
  createFeedProcessingProgressProjection,
  projectFeedProcessingProgress,
  rebaseFeedProcessingProgressProjection,
} = require("../model/feed-processing-progress.ts");

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
      phase: "processing",
      serverProgressPercent: 0,
      estimatedRemainingSeconds: 60,
      transportState: "idle",
      listRefreshState: "idle",
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
    { phase: "completed", serverProgressPercent: 100 },
  );
  assert.deepEqual(
    adaptFeedAiJobStatus({
      status: "FAILED",
      progressPercent: 73,
      isCompleted: true,
    }),
    { phase: "failed", serverProgressPercent: 73 },
  );
});

test("SSE가 없어도 예상 잔여 시간에 따라 95%까지 증가한다", () => {
  const projection = createFeedProcessingProgressProjection(
    {
      serverProgressPercent: 20,
      estimatedRemainingSeconds: 100,
      progressEstimateUpdatedAt: 1_000,
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
      progressEstimateUpdatedAt: 0,
    },
    0,
  );
  const displayBeforeSse = projectFeedProcessingProgress(initial, 10_000);
  const rebased = rebaseFeedProcessingProgressProjection(
    initial,
    {
      serverProgressPercent: 50,
      estimatedRemainingSeconds: 60,
      progressEstimateUpdatedAt: 10_000,
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
      progressEstimateUpdatedAt: 0,
    },
    0,
  );
  const rebased = rebaseFeedProcessingProgressProjection(
    initial,
    {
      serverProgressPercent: 98,
      estimatedRemainingSeconds: 20,
      progressEstimateUpdatedAt: 5_000,
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
  useFeedProcessingStore.getState().start({
    jobId: "job-current",
    feedId: "feed-current",
    status: "PROCESSING",
    progressPercent: 10,
    estimatedRemainingSeconds: 90,
    estimatedCompletedAt: "2026-07-29T12:00:00.000Z",
    isCompleted: false,
  });

  useFeedProcessingStore.getState().applyStatus("job-old", {
    status: "COMPLETED",
    progressPercent: 100,
    isCompleted: true,
  });
  assert.equal(useFeedProcessingStore.getState().job.serverProgressPercent, 10);

  useFeedProcessingStore.getState().applyStatus("job-current", {
    status: "PROCESSING",
    progressPercent: 62,
    isCompleted: false,
  });
  assert.equal(useFeedProcessingStore.getState().job.serverProgressPercent, 62);

  const progressEstimateObservedAfter = Date.now();
  useFeedProcessingStore.getState().applyProgress("job-current", {
    jobId: "job-current",
    status: "PROCESSING",
    progressPercent: 50,
    estimatedRemainingSeconds: 120,
    isCompleted: false,
  });
  assert.equal(useFeedProcessingStore.getState().job.serverProgressPercent, 50);
  assert.equal(
    useFeedProcessingStore.getState().job.estimatedRemainingSeconds,
    120,
  );
  assert.ok(
    useFeedProcessingStore.getState().job.progressEstimateUpdatedAt >=
      progressEstimateObservedAfter,
  );

  useFeedProcessingStore.getState().dismiss();
});
