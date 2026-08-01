const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

const {
  getRtcRoomReconnectDelay,
  isRtcFinalizationBlocking,
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

test("RTC 종료 요청과 결과 전달 단계에서만 카메라 입력을 차단한다", () => {
  assert.equal(isRtcFinalizationBlocking("IDLE"), false);
  assert.equal(isRtcFinalizationBlocking("PREPARING_PHOTOS"), false);
  assert.equal(isRtcFinalizationBlocking("ENDING_ROOM"), true);
  assert.equal(isRtcFinalizationBlocking("DELIVERING_RESULT"), true);
  assert.equal(isRtcFinalizationBlocking("FAILED"), false);
});

test("카메라 종료 오버레이는 lifecycle을 유지한 채 입력과 화면 이탈을 차단한다", () => {
  const pageSource = readSource(
    "../../../../pages/camera/ui/camera-page.tsx",
  );
  const overlaySource = readSource(
    "../ui/rtc-finalization-overlay.tsx",
  );

  assert.match(
    pageSource,
    /usePreventRemove\(isFinalizationBlocking/,
  );
  assert.match(
    pageSource,
    /BackHandler\.addEventListener\(\s*"hardwareBackPress",\s*\(\) => true/,
  );
  assert.match(
    pageSource,
    /<RtcFinalizationOverlay state=\{finalizationState\} \/>/,
  );
  assert.match(overlaySource, /pointerEvents="auto"/);
  assert.match(overlaySource, /accessibilityViewIsModal/);
});

test("사진이 포함된 RTC 종료 요청은 호스트 인증과 upload fetch를 사용한다", () => {
  const source = readSource(
    "../../../../entities/rtc/api/rtc-host-query.ts",
  );

  assert.match(source, /const headers = createRtcHostHeaders\(id\)/);
  assert.match(source, /uploadFetchClient\.patch\(\{/);
  assert.match(source, /formData: ObjectToFormData\(parsedRequest\)/);
  assert.match(source, /headers,/);
  assert.match(
    source,
    /privateApiClient\.patch\(url, undefined, \{\s*headers,/,
  );
});

test("RTC 종료 실패는 인라인 문구 대신 재시도 Alert로 표시한다", () => {
  const source = readSource(
    "../../../../pages/camera/ui/rtc-livekit-page.tsx",
  );

  assert.match(source, /Alert\.alert\(\s*"RTC 방 종료 실패"/);
  assert.match(source, /text: "종료 처리 다시 시도"/);
  assert.doesNotMatch(
    source,
    /<ButtonText>종료 처리 다시 시도<\/ButtonText>/,
  );
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
