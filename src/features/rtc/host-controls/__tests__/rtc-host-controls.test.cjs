const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getRtcRoomReconnectDelay,
  isRtcFinalizationPending,
  resolveRtcCameraMenuMode,
} = require("../model/rtc-host-control.ts");
const {
  mergeRtcRoomEvent,
} = require("../../../../entities/rtc/api/rtc-room-event-state.ts");
const {
  RtcRoomEventPayloadSchema,
} = require("../../../../entities/rtc/model/rtc-room-schema.ts");
const {
  createSseParser,
} = require("../../../../shared/api/sse-parser.ts");

test("RTC 카메라 메뉴는 busy 상태를 live보다 우선한다", () => {
  assert.equal(
    resolveRtcCameraMenuMode({ isBusy: true, isLive: true }),
    "BUSY",
  );
  assert.equal(
    resolveRtcCameraMenuMode({ isBusy: false, isLive: true }),
    "LIVE",
  );
  assert.equal(
    resolveRtcCameraMenuMode({ isBusy: false, isLive: false }),
    "IDLE",
  );
});

test("RTC 종료 진행 상태만 pending으로 분류한다", () => {
  assert.equal(isRtcFinalizationPending("PREPARING_PHOTOS"), true);
  assert.equal(isRtcFinalizationPending("ENDING_ROOM"), true);
  assert.equal(isRtcFinalizationPending("DELIVERING_RESULT"), true);
  assert.equal(isRtcFinalizationPending("FAILED"), false);
  assert.equal(isRtcFinalizationPending("IDLE"), false);
});

test("RTC SSE 재연결 지연은 지수 증가 후 15초로 제한한다", () => {
  assert.equal(getRtcRoomReconnectDelay(0), 1_000);
  assert.equal(getRtcRoomReconnectDelay(2), 4_000);
  assert.equal(getRtcRoomReconnectDelay(10), 15_000);
});

test("분할된 participants SSE를 검증하고 room cache에 병합한다", () => {
  const events = [];
  const parser = createSseParser((message) => {
    const payload = RtcRoomEventPayloadSchema.safeParse(
      JSON.parse(message.data),
    );
    if (payload.success) {
      events.push({
        type: message.event,
        payload: payload.data,
      });
    }
  });

  parser.push("event: participants\ndata: {\"roomId\":\"room-1\",");
  parser.push(
    "\"status\":\"LIVE\",\"participants\":[{\"nickname\":\"민지\",\"role\":\"VIEWER\",\"profileImage\":null}]}\n\n",
  );

  assert.equal(events.length, 1);

  const room = {
    roomId: "room-1",
    status: "WAITING",
    expiresAt: "2026-07-30T12:00:00.000Z",
    host: {
      nickname: "호스트",
      profileImage: null,
    },
    participants: [],
  };
  const merged = mergeRtcRoomEvent(room, events[0]);

  assert.equal(merged.status, "LIVE");
  assert.equal(merged.participants.length, 1);
  assert.equal(merged.participants[0].nickname, "민지");
  assert.equal(merged.host.nickname, "호스트");
});

test("roomId가 없는 RTC SSE payload는 schema에서 거부한다", () => {
  assert.equal(
    RtcRoomEventPayloadSchema.safeParse({
      status: "LIVE",
    }).success,
    false,
  );
});
