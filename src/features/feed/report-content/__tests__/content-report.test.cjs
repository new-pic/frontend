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
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  CONTENT_REPORT_DESCRIPTION_MAX_LENGTH,
  CONTENT_REPORT_REASONS,
  CreateContentReportRequestSchema,
} = require("../../../../entities/feed/model/report.ts");
const {
  getContentReportPath,
} = require("../../../../entities/feed/api/feed-report-adapter.ts");
const {
  canReportContent,
  getContentReportTargetLabel,
} = require("../model/report-content.ts");

test("피드와 댓글 신고 경로를 대상에 맞게 선택한다", () => {
  assert.equal(
    getContentReportPath({ type: "feed", id: "feed-1" }),
    "/feed/feed-1/reports",
  );
  assert.equal(
    getContentReportPath({ type: "comment", id: "comment/1" }),
    "/feed/comments/comment%2F1/reports",
  );
});

test("API 계약의 신고 사유 Enum을 모두 제공한다", () => {
  assert.deepEqual(CONTENT_REPORT_REASONS, [
    "SPAM",
    "HARASSMENT",
    "HATE_SPEECH",
    "INAPPROPRIATE",
    "OTHER",
  ]);
});

test("상세 사유를 trim하고 빈 값은 요청에서 제외한다", () => {
  assert.deepEqual(
    CreateContentReportRequestSchema.parse({
      reason: "SPAM",
      description: "  반복 광고입니다.  ",
    }),
    {
      reason: "SPAM",
      description: "반복 광고입니다.",
    },
  );
  assert.deepEqual(
    CreateContentReportRequestSchema.parse({
      reason: "OTHER",
      description: "   ",
    }),
    {
      reason: "OTHER",
      description: undefined,
    },
  );
});

test("상세 사유는 최대 500자까지 허용한다", () => {
  assert.equal(
    CreateContentReportRequestSchema.safeParse({
      reason: "HARASSMENT",
      description: "가".repeat(CONTENT_REPORT_DESCRIPTION_MAX_LENGTH),
    }).success,
    true,
  );
  assert.equal(
    CreateContentReportRequestSchema.safeParse({
      reason: "HARASSMENT",
      description: "가".repeat(CONTENT_REPORT_DESCRIPTION_MAX_LENGTH + 1),
    }).success,
    false,
  );
});

test("본인 콘텐츠는 숨기고 게스트와 다른 회원에게 신고 진입점을 제공한다", () => {
  assert.equal(
    canReportContent({ authorId: "user-1", currentUserId: "user-1" }),
    false,
  );
  assert.equal(
    canReportContent({ authorId: "user-1", currentUserId: "user-2" }),
    true,
  );
  assert.equal(
    canReportContent({ authorId: "user-1", currentUserId: null }),
    true,
  );
});

test("신고 대상에 맞는 제목 label을 반환한다", () => {
  assert.equal(
    getContentReportTargetLabel({ type: "feed", id: "feed-1" }),
    "피드",
  );
  assert.equal(
    getContentReportTargetLabel({ type: "comment", id: "comment-1" }),
    "댓글",
  );
});

test("신고 제출은 ref 잠금으로 연속 요청을 차단한다", () => {
  const source = fs.readFileSync(
    require.resolve("../ui/report-content-modal.tsx"),
    "utf8",
  );

  assert.match(source, /const isSubmittingRef = useRef\(false\)/);
  assert.match(source, /if \(isSubmittingRef\.current\) return/);
  assert.match(source, /isSubmittingRef\.current = true/);
  assert.match(
    source,
    /onError:[\s\S]*isSubmittingRef\.current = false/,
  );
});
