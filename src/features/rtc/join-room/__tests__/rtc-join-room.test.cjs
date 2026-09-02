const assert = require("node:assert/strict");
const test = require("node:test");

const { resolveRtcViewerRoomSignal } = require("../model/rtc-viewer-entry.ts");

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

  assert.match(source, /rtcRoomQuery\.subscribeRtcRoomEvents/);
  assert.match(source, /signal === "LIVE"/);
  assert.match(source, /phase !== "TOKEN_ERROR"/);
  assert.match(source, /tokenAttemptedRef\.current = false/);
  assert.match(source, /setConnection\(\{/);
});

test("참여자 나가기는 서버 leave 성공 후 LiveKit과 session을 정리한다", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.resolve(__dirname, "../model/use-rtc-viewer-exit-controller.ts"),
    "utf8",
  );
  const leaveIndex = source.indexOf("await leaveRoom");
  const disconnectIndex = source.indexOf("await disconnectLiveKit?.()");
  const exitIndex = source.indexOf("onExited()", disconnectIndex);

  assert.ok(leaveIndex >= 0);
  assert.ok(disconnectIndex > leaveIndex);
  assert.ok(exitIndex > disconnectIndex);
});

test("Viewer 화면 이탈도 연결 상태에 맞는 동일한 나가기 요청을 사용한다", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../../../pages/camera/ui/rtc-viewer-page.tsx"),
    "utf8",
  );

  assert.match(source, /usePreventRemove\(shouldPreventViewerExit/);
  assert.match(source, /setExitRequestId\(\(current\) => current \+ 1\)/);
  assert.match(source, /void handleCancelBeforeLiveKit\(\)/);
});
