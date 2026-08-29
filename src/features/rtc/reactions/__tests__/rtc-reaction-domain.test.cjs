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
  adaptRtcReactionEmojis,
  canSendRtcReaction,
  enqueueRtcReactionBubble,
  parseRtcReceivedReaction,
} = require("../lib/rtc-reaction-domain.ts");
const { getRtcReactionServerUrl } = require("../lib/rtc-reaction-endpoint.ts");
const {
  createRtcReactionHostJoinPayload,
  createRtcReactionViewerJoinPayload,
  getRtcReactionJoinEvent,
  getRtcReactionJoinRetryDelay,
  isRtcReactionJoinSuccess,
} = require("../lib/rtc-reaction-join.ts");

test("API URL에서 Socket.IO 서버 origin만 분리한다", () => {
  assert.equal(
    getRtcReactionServerUrl(
      "https://selgo-backend-production.up.railway.app/api",
    ),
    "https://selgo-backend-production.up.railway.app",
  );
});

test("서버 이모지 DTO를 중복 없이 domain 목록으로 변환한다", () => {
  assert.deepEqual(
    adaptRtcReactionEmojis({
      items: [
        { id: "LIKE", label: " 좋아요 ", symbol: "👍" },
        { id: "LIKE", label: "중복", symbol: "👍" },
        { id: "", label: "잘못됨", symbol: "?" },
      ],
    }),
    [{ id: "LIKE", label: "좋아요", symbol: "👍" }],
  );
});

test("수신 payload는 emojiId가 있을 때만 허용한다", () => {
  assert.deepEqual(parseRtcReceivedReaction({ emojiId: " LIKE " }), {
    emojiId: "LIKE",
  });
  assert.equal(parseRtcReceivedReaction({ emoji: "LIKE" }), null);
  assert.equal(parseRtcReceivedReaction(null), null);
});

test("클라이언트 전송 간격 300ms를 지킨다", () => {
  assert.equal(canSendRtcReaction(null, 1000, 300), true);
  assert.equal(canSendRtcReaction(1000, 1299, 300), false);
  assert.equal(canSendRtcReaction(1000, 1300, 300), true);
});

test("버블 폭주 시 가장 오래된 항목부터 제거한다", () => {
  const current = [{ renderId: "1" }, { renderId: "2" }, { renderId: "3" }];
  const next = { renderId: "4" };

  assert.deepEqual(
    enqueueRtcReactionBubble(current, next, 3).map(({ renderId }) => renderId),
    ["2", "3", "4"],
  );
});

test("역할에 맞는 reaction room join event와 payload를 만든다", () => {
  assert.equal(getRtcReactionJoinEvent("HOST"), "rtc:host:join");
  assert.equal(getRtcReactionJoinEvent("VIEWER"), "rtc:viewer:join");
  assert.deepEqual(createRtcReactionHostJoinPayload(" room-1 "), {
    roomId: "room-1",
  });
  assert.deepEqual(
    createRtcReactionViewerJoinPayload(" room-1 ", " participant-1 "),
    {
      roomId: "room-1",
      participantId: "participant-1",
    },
  );
});

test("join acknowledgement는 ok true일 때만 성공이다", () => {
  assert.equal(isRtcReactionJoinSuccess({ ok: true }), true);
  assert.equal(isRtcReactionJoinSuccess({ ok: false }), false);
  assert.equal(isRtcReactionJoinSuccess(undefined), false);
});

test("join 재시도는 지수 증가 후 15초로 제한한다", () => {
  assert.equal(getRtcReactionJoinRetryDelay(0), 1_000);
  assert.equal(getRtcReactionJoinRetryDelay(2), 4_000);
  assert.equal(getRtcReactionJoinRetryDelay(10), 15_000);
});

test("transport는 join 성공 전 전송을 막고 disconnect에서 상태를 초기화한다", () => {
  const path = require("node:path");
  const source = fs.readFileSync(
    path.resolve(__dirname, "../api/socket-io-reaction-transport.ts"),
    "utf8",
  );

  assert.match(
    source,
    /role !== "VIEWER" \|\| !socket\.connected \|\| !joined/,
  );
  assert.match(source, /joined = false;\s*clearJoinRetry\(\);/);
  assert.match(source, /RTC_REACTION_SOCKET_CONFIG\.hostJoinEvent/);
  assert.match(source, /RTC_REACTION_SOCKET_CONFIG\.viewerJoinEvent/);
});

test("viewer reaction UI는 session participantId를 join 계층에 전달한다", () => {
  const path = require("node:path");
  const pageSource = fs.readFileSync(
    path.resolve(__dirname, "../../../../pages/camera/ui/rtc-viewer-page.tsx"),
    "utf8",
  );
  const pickerSource = fs.readFileSync(
    path.resolve(__dirname, "../ui/rtc-viewer-reaction-picker.tsx"),
    "utf8",
  );

  assert.match(pageSource, /participantId=\{viewerSession\.participantId\}/);
  assert.match(pickerSource, /participantId,/);
  assert.match(pickerSource, /role: "VIEWER"/);
});
