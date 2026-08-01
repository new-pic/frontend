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
  FEED_RELATIVE_TIME_WINDOW_MS,
  formatFeedDetailTime,
  formatFeedTimestamp,
} = require("../model/feed-detail-time.ts");

const NOW = new Date(2026, 7, 1, 12, 0, 0).getTime();

test("최근 피드 시간은 분, 시간, 일 상대시간으로 표시한다", () => {
  assert.equal(formatFeedTimestamp(NOW - 30 * 1000, NOW), "방금 전");
  assert.equal(formatFeedTimestamp(NOW - 12 * 60 * 1000, NOW), "12분 전");
  assert.equal(formatFeedTimestamp(NOW - 5 * 60 * 60 * 1000, NOW), "5시간 전");
  assert.equal(formatFeedTimestamp(NOW - 3 * 24 * 60 * 60 * 1000, NOW), "3일 전");
});

test("7일 경계부터 절대 날짜를 표시한다", () => {
  const timestamp = NOW - FEED_RELATIVE_TIME_WINDOW_MS;
  assert.equal(
    formatFeedTimestamp(timestamp, NOW),
    new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(timestamp),
  );
});

test("실제로 수정된 피드만 업로드 시간과 수정 시간을 함께 표시한다", () => {
  const createdAt = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();
  assert.equal(
    formatFeedDetailTime({ createdAt, updatedAt: createdAt, now: NOW }),
    "업로드 2시간 전",
  );

  const updatedAt = new Date(NOW - 20 * 60 * 1000).toISOString();
  assert.equal(
    formatFeedDetailTime({ createdAt, updatedAt, now: NOW }),
    "업로드 2시간 전 · 수정 20분 전",
  );
});

test("미래 시간은 방금 전으로 보정하고 잘못된 시간은 숨긴다", () => {
  assert.equal(formatFeedTimestamp(NOW + 60 * 1000, NOW), "방금 전");
  assert.equal(
    formatFeedDetailTime({
      createdAt: "invalid",
      updatedAt: "invalid",
      now: NOW,
    }),
    "",
  );
});
