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
  isFeedPublishingPipelineActive,
} = require("../model/feed-publishing-state.ts");
const {
  useFeedPublishingStore,
} = require("../model/feed-publishing-store.ts");
const {
  FEED_PROCESSING_CONFIG,
} = require("../config/feed-processing-config.ts");
const {
  claimFeedCompletionHaptic,
  getProcessingCompletionHapticKey,
  getPublishingCompletionHapticKey,
} = require("../model/feed-completion-haptic.ts");
const {
  createApiRequestError,
  getApiErrorMessage,
} = require("../../../../shared/api/api-error.ts");

const originalModuleLoad = Module._load;
Module._load = function mockExpoFileSystem(request, parent, isMain) {
  if (request === "expo-file-system") return { File: class File {} };
  return originalModuleLoad.call(this, request, parent, isMain);
};
const {
  CreateFeedFormSchema,
  UpdateFeedFormSchema,
} = require("../../../../entities/feed/model/schema.ts");
Module._load = originalModuleLoad;

const createCommand = {
  kind: "CREATE",
  image: {
    uri: "file:///cache/feed.jpg",
    fileName: "feed.jpg",
    isTemporary: true,
  },
  description: "설명",
  tags: ["일상"],
};

test("성공 배지는 8초 동안 표시한다", () => {
  assert.equal(FEED_PROCESSING_CONFIG.completedBadgeDurationMs, 8_000);
});

test("수정 완료와 목록 갱신이 끝난 생성 작업만 햅틱 대상으로 만든다", () => {
  const updateTask = {
    id: "update-1",
    command: {
      kind: "UPDATE",
      feedId: "feed-1",
      description: "수정한 설명",
      tags: [],
    },
    phase: "completed",
  };
  const completedJob = {
    jobId: "job-1",
    feedId: "feed-1",
    phase: "completed",
    serverProgressPercent: 100,
    transportState: "idle",
    listRefreshState: "succeeded",
  };

  assert.equal(
    getPublishingCompletionHapticKey(updateTask),
    "publishing:update-1",
  );
  assert.equal(
    getPublishingCompletionHapticKey({
      ...updateTask,
      phase: "updating",
    }),
    null,
  );
  assert.equal(
    getProcessingCompletionHapticKey(completedJob),
    "processing:job-1",
  );
  assert.equal(
    getProcessingCompletionHapticKey({
      ...completedJob,
      listRefreshState: "pending",
    }),
    null,
  );
});

test("완료 햅틱은 작업마다 한 번만 소비하고 background에서는 지연 실행하지 않는다", () => {
  const handledKeys = new Set();

  assert.equal(
    claimFeedCompletionHaptic(handledKeys, "publishing:update-1", true),
    true,
  );
  assert.equal(
    claimFeedCompletionHaptic(handledKeys, "publishing:update-1", true),
    false,
  );
  assert.equal(
    claimFeedCompletionHaptic(handledKeys, "processing:job-1", false),
    false,
  );
  assert.equal(
    claimFeedCompletionHaptic(handledKeys, "processing:job-1", true),
    false,
  );
});

test("활성 게시 작업이 있으면 두 번째 게시 명령을 거절한다", () => {
  const store = useFeedPublishingStore.getState();
  assert.equal(store.enqueue(createCommand), true);
  assert.equal(store.enqueue({ ...createCommand, description: "두 번째" }), false);

  const task = useFeedPublishingStore.getState().task;
  assert.equal(task.command.description, "설명");
  store.dismiss(task.id);
});

test("실패한 작업은 같은 명령으로 재시도할 수 있다", () => {
  const store = useFeedPublishingStore.getState();
  store.enqueue(createCommand);
  const taskId = useFeedPublishingStore.getState().task.id;

  store.setPhase(taskId, "uploading");
  store.fail(taskId, "네트워크 오류");
  assert.equal(useFeedPublishingStore.getState().task.phase, "failed");
  assert.equal(
    isFeedPublishingPipelineActive(
      useFeedPublishingStore.getState().task,
      null,
    ),
    true,
  );
  assert.equal(
    store.enqueue({ ...createCommand, description: "새 작업" }),
    false,
  );

  store.retry(taskId);
  assert.equal(useFeedPublishingStore.getState().task.phase, "queued");
  store.dismiss(taskId);
});

test("완료 배지가 남아 있어도 게시 슬롯을 해제하고 새 작업으로 교체한다", () => {
  const store = useFeedPublishingStore.getState();
  const updateCommand = {
    kind: "UPDATE",
    feedId: "feed-1",
    description: "수정한 설명",
    tags: ["일상"],
  };

  assert.equal(store.enqueue(updateCommand), true);
  const completedTaskId = useFeedPublishingStore.getState().task.id;
  store.setPhase(completedTaskId, "completed");

  assert.equal(
    isFeedPublishingPipelineActive(
      useFeedPublishingStore.getState().task,
      null,
    ),
    false,
  );
  assert.equal(store.enqueue(createCommand), true);
  assert.equal(
    useFeedPublishingStore.getState().task.command.kind,
    "CREATE",
  );

  store.dismiss(useFeedPublishingStore.getState().task.id);
});

test("서버 AI 처리와 목록 갱신까지 단일 게시 파이프라인으로 본다", () => {
  const processingJob = {
    jobId: "job-1",
    feedId: "feed-1",
    phase: "processing",
    serverProgressPercent: 40,
    transportState: "streaming",
    listRefreshState: "idle",
  };

  assert.equal(isFeedPublishingPipelineActive(null, processingJob), true);
  assert.equal(
    isFeedPublishingPipelineActive(null, {
      ...processingJob,
      phase: "completed",
      listRefreshState: "pending",
    }),
    true,
  );
  assert.equal(
    isFeedPublishingPipelineActive(null, {
      ...processingJob,
      phase: "completed",
      listRefreshState: "succeeded",
    }),
    false,
  );
});

test("객체 형태의 서버 오류에서 사용자 메시지를 추출한다", () => {
  const error = createApiRequestError({
    payload: { message: "이미지 형식이 올바르지 않습니다." },
    status: 400,
    fallback: "업로드 실패",
  });

  assert.equal(
    getApiErrorMessage(error, "업로드 실패"),
    "이미지 형식이 올바르지 않습니다.",
  );
  assert.equal(error.message.includes("[object Object]"), false);
});

test("수정 폼은 새 이미지 없이 유효하고 작성 폼은 이미지를 요구한다", () => {
  const values = {
    image: "",
    description: "수정한 설명",
    tags: ["일상"],
  };

  assert.equal(UpdateFeedFormSchema.safeParse(values).success, true);
  assert.equal(CreateFeedFormSchema.safeParse(values).success, false);
});
