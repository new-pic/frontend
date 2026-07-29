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
const {
  getRtcReactionServerUrl,
} = require("../lib/rtc-reaction-endpoint.ts");

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
  const current = [
    { renderId: "1" },
    { renderId: "2" },
    { renderId: "3" },
  ];
  const next = { renderId: "4" };

  assert.deepEqual(
    enqueueRtcReactionBubble(current, next, 3).map(
      ({ renderId }) => renderId,
    ),
    ["2", "3", "4"],
  );
});
