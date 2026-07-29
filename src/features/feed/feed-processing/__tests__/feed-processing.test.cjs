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
const {
  parseFeedAiJobEvent,
} = require("../../../../entities/feed/api/feed-ai-job-event.ts");
const {
  adaptCreatedFeedAiJob,
  adaptFeedAiJobStatus,
} = require("../lib/feed-ai-job-adapter.ts");
const {
  useFeedProcessingStore,
} = require("../model/feed-processing-store.ts");

test("분할된 SSE chunk와 CRLF를 하나의 progress event로 조립한다", () => {
  const messages = [];
  const parser = createSseParser((message) => messages.push(message));

  parser.push("event: progress\r\ndata: {\"jobId\":\"job-1\",");
  parser.push(
    "\"status\":\"PROCESSING\",\"progressPercent\":55," +
      "\"estimatedRemainingSeconds\":54,\"isCompleted\":false}\r\n\r\n",
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
  assert.equal(
    parseFeedAiJobEvent({ event: "heartbeat", data: "{}" }),
    null,
  );
  assert.equal(
    parseFeedAiJobEvent({
      event: "progress",
      data: "{\"progressPercent\":50}",
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
      progressPercent: 0,
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
    { phase: "completed", progressPercent: 100 },
  );
  assert.deepEqual(
    adaptFeedAiJobStatus({
      status: "FAILED",
      progressPercent: 73,
      isCompleted: true,
    }),
    { phase: "failed", progressPercent: 73 },
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
  assert.equal(
    useFeedProcessingStore.getState().job.progressPercent,
    10,
  );

  useFeedProcessingStore.getState().applyStatus("job-current", {
    status: "PROCESSING",
    progressPercent: 62,
    isCompleted: false,
  });
  assert.equal(
    useFeedProcessingStore.getState().job.progressPercent,
    62,
  );

  useFeedProcessingStore.getState().dismiss();
});
