const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isCurrentRtcViewerSession,
} = require("../../../../entities/rtc/model/rtc-viewer-session.ts");
const { resolveRtcViewerRoomSignal } = require("../model/rtc-viewer-entry.ts");

const currentSession = {
  roomId: "room-1",
  participantId: "participant-1",
};

test("참여자 LiveKit 요청은 roomId와 participantId가 모두 같아야 현재 세션이다", () => {
  assert.equal(
    isCurrentRtcViewerSession(currentSession, {
      roomId: "room-1",
      participantId: "participant-1",
    }),
    true,
  );
  assert.equal(
    isCurrentRtcViewerSession(currentSession, {
      roomId: "room-2",
      participantId: "participant-1",
    }),
    false,
  );
  assert.equal(
    isCurrentRtcViewerSession(currentSession, {
      roomId: "room-1",
      participantId: "participant-2",
    }),
    false,
  );
});

test("참여자 LiveKit 요청 비교 전 ID의 바깥 공백을 제거한다", () => {
  assert.equal(
    isCurrentRtcViewerSession(currentSession, {
      roomId: " room-1 ",
      participantId: " participant-1 ",
    }),
    true,
  );
});

test("RTC snapshot 상태가 LIVE일 때만 참여자 연결 신호를 반환한다", () => {
  assert.equal(
    resolveRtcViewerRoomSignal({
      type: "snapshot",
      payload: {
        roomId: "room-1",
        status: "LIVE",
      },
    }),
    "LIVE",
  );
  assert.equal(
    resolveRtcViewerRoomSignal({
      type: "status",
      payload: {
        roomId: "room-1",
        status: "WAITING",
      },
    }),
    null,
  );
});

test("ended 이벤트는 LIVE 이전에도 종료 신호로 처리한다", () => {
  assert.equal(
    resolveRtcViewerRoomSignal({
      type: "ended",
      payload: {
        roomId: "room-1",
      },
    }),
    "ENDED",
  );
});

test("참여 폼은 join 성공 후 토큰을 발급하지 않고 대기 화면으로 이동한다", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.resolve(__dirname, "../ui/rtc-join-form.tsx"),
    "utf8",
  );

  assert.match(source, /await joinRoomMutation\.mutateAsync/);
  assert.match(source, /router\.replace\(RTC_NAVIGATION\.paths\.viewer/);
  assert.doesNotMatch(source, /useCreateViewerLiveKitToken/);
});

test("참여자 진입 hook은 공용 SSE와 수동 토큰 재시도를 소유한다", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.resolve(__dirname, "../model/use-rtc-viewer-entry.ts"),
    "utf8",
  );

  assert.match(source, /rtcQuery\.subscribeRtcRoomEvents/);
  assert.match(source, /signal === "LIVE"/);
  assert.match(source, /phase !== "TOKEN_ERROR"/);
  assert.match(source, /tokenAttemptedRef\.current = false/);
});
