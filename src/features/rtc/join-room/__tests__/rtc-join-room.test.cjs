const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isCurrentRtcViewerSession,
} = require("../../../../entities/rtc/model/rtc-viewer-session.ts");

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
