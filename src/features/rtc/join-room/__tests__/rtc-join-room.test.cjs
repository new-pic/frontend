const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isRtcViewerEntryCallbackCurrent,
  resolveRtcViewerRoomSignal,
  shouldMountRtcViewerLiveKit,
} = require("../model/rtc-viewer-entry.ts");

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

test("정리된 이전 Viewer entry의 늦은 LIVE와 ENDED callback을 무시한다", () => {
  for (const signal of ["LIVE", "ENDED"]) {
    assert.equal(
      isRtcViewerEntryCallbackCurrent({
        currentEpoch: 2,
        callbackEpoch: 1,
        isMounted: true,
      }),
      false,
      `${signal} callback이 이전 entry에서 전달됨`,
    );
  }
  assert.equal(
    isRtcViewerEntryCallbackCurrent({
      currentEpoch: 1,
      callbackEpoch: 1,
      isMounted: false,
    }),
    false,
  );
  assert.equal(
    isRtcViewerEntryCallbackCurrent({
      currentEpoch: 1,
      callbackEpoch: 1,
      isMounted: true,
    }),
    true,
  );
});

test("LiveKit 진입 전 취소 중에는 늦게 도착한 connection을 mount하지 않는다", () => {
  assert.equal(
    shouldMountRtcViewerLiveKit({
      hasSession: true,
      hasConnection: true,
      isCancelingBeforeLiveKit: true,
    }),
    false,
  );
  assert.equal(
    shouldMountRtcViewerLiveKit({
      hasSession: true,
      hasConnection: true,
      isCancelingBeforeLiveKit: false,
    }),
    true,
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
  const pageSource = fs.readFileSync(
    path.resolve(__dirname, "../../../../pages/camera/ui/rtc-viewer-page.tsx"),
    "utf8",
  );
  const controllerSource = fs.readFileSync(
    path.resolve(__dirname, "../model/use-rtc-viewer-session-controller.ts"),
    "utf8",
  );

  assert.match(pageSource, /usePreventRemove\(/);
  assert.match(
    pageSource,
    /usePreventRemove\(\s*shouldPreventExit,\s*requestPageExit,?\s*\)/,
  );
  assert.match(
    controllerSource,
    /setExitRequestId\(\s*\(current\)\s*=>\s*current\s*\+\s*1,?\s*\)/,
  );
  assert.match(controllerSource, /void\s+cancelBeforeLiveKit\(\s*\)/);
});

test("종료 결과 fallback 대기 중에는 결과 준비 화면을 유지하고 이탈을 막는다", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const controllerSource = fs.readFileSync(
    path.resolve(__dirname, "../model/use-rtc-viewer-session-controller.ts"),
    "utf8",
  );
  const workspaceSource = fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../../widgets/rtc/session-workspace/ui/rtc-viewer-workspace.tsx",
    ),
    "utf8",
  );

  assert.match(
    controllerSource,
    /viewerEntry\.phase === "ROOM_ENDED" &&\s*hasEnteredLiveRef\.current/,
  );
  assert.match(controllerSource, /const isResultPending =/);
  assert.match(workspaceSource, /<RtcViewerWaiting mode="PREPARING_RESULT"/);
});
