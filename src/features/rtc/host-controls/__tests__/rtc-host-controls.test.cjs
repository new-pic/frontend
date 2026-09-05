const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

const {
  getRtcRoomReconnectDelay,
  isRtcFinalizationBlocking,
  isRtcFinalizationPending,
  resolveRtcCameraMenuMode,
} = require("../model/rtc-host-control.ts");
const {
  completeRtcHostTermination,
  executeRtcHostTermination,
} = require("../model/rtc-host-termination.ts");
const {
  mergeRtcRoomEvent,
} = require("../../../../entities/rtc-room/api/rtc-room-event-state.ts");
const {
  parseRtcRoomEvent,
} = require("../../../../entities/rtc-room/api/rtc-room-event.ts");
const {
  RtcRoomEventPayloadSchema,
} = require("../../../../entities/rtc-room/model/room-state-schema.ts");
const { createSseParser } = require("../../../../shared/api/sse-parser.ts");

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

test("event 이름이 없는 RTC SSE를 snapshot으로 해석한다", () => {
  const event = parseRtcRoomEvent({
    event: "message",
    data: JSON.stringify({
      roomId: "room-1",
      status: "WAITING",
      expiresAt: "2026-08-04T12:00:00.000Z",
      host: {
        nickname: "호스트",
        profileImage: null,
      },
      participants: [
        {
          nickname: "민서",
          role: "VIEWER",
          profileImage: null,
        },
      ],
    }),
  });

  assert.equal(event?.type, "snapshot");
  assert.equal(event?.payload.participants.length, 1);
  assert.equal(event?.payload.participants[0].nickname, "민서");
});

test("초기 snapshot은 기존 room cache가 없어도 방 상태를 생성한다", () => {
  const event = parseRtcRoomEvent({
    event: "message",
    data: JSON.stringify({
      roomId: "room-1",
      status: "WAITING",
      expiresAt: "2026-08-04T12:00:00.000Z",
      host: {
        nickname: "호스트",
        profileImage: null,
      },
      participants: [
        {
          nickname: "민서",
          role: "VIEWER",
          profileImage: null,
        },
      ],
    }),
  });

  assert.ok(event);

  const room = mergeRtcRoomEvent(undefined, event);

  assert.equal(room?.roomId, "room-1");
  assert.equal(room?.participants.length, 1);
});

test("event 이름이 없는 ENDED 상태를 종료 이벤트로 해석한다", () => {
  const event = parseRtcRoomEvent({
    event: "message",
    data: JSON.stringify({
      roomId: "room-1",
      status: "ENDED",
      expiresAt: "2026-08-04T12:00:00.000Z",
      host: {
        nickname: "호스트",
        profileImage: null,
      },
      participants: [],
    }),
  });

  assert.equal(event?.type, "ended");
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
  const pageSource = readSource("../../../../pages/camera/ui/camera-page.tsx");
  const workspaceSource = readSource(
    "../../../../widgets/camera/capture-workspace/ui/camera-capture-workspace.tsx",
  );
  const controllerSource = readSource(
    "../model/use-rtc-host-session-controller.ts",
  );
  const overlaySource = readSource("../ui/rtc-finalization-overlay.tsx");

  assert.match(pageSource, /usePreventRemove\(isExitBlocked/);
  assert.match(
    pageSource,
    /BackHandler\.addEventListener\(\s*"hardwareBackPress"/,
  );
  assert.match(
    controllerSource,
    /Boolean\(broadcastConnection\) \|\|\s*isRtcFinalizationBlocking/,
  );
  assert.match(
    workspaceSource,
    /<RtcFinalizationOverlay state=\{finalizationState\} \/>/,
  );
  assert.match(overlaySource, /pointerEvents="auto"/);
  assert.match(overlaySource, /accessibilityViewIsModal/);
});

test("사진이 포함된 RTC 종료 요청은 호스트 인증과 upload fetch를 사용한다", () => {
  const source = readSource("../api/rtc-host-query.ts");

  assert.match(source, /const headers = createRtcHostHeaders\(id\)/);
  assert.match(source, /uploadFetchClient\.patch\(\{/);
  assert.match(source, /formData: ObjectToFormData\(parsedRequest\)/);
  assert.match(source, /headers,/);
  assert.match(
    source,
    /privateApiClient\.patch\(url, undefined, \{\s*headers\s*\}\)/,
  );
});

test("RTC 종료 실패는 인라인 문구 대신 재시도 Alert로 표시한다", () => {
  const source = readSource("../ui/rtc-host-livekit.tsx");

  assert.match(source, /Alert\.alert\(\s*"RTC 방 종료 실패"/);
  assert.match(source, /text: "종료 처리 다시 시도"/);
  assert.doesNotMatch(source, /<ButtonText>종료 처리 다시 시도<\/ButtonText>/);
});

test("Host 종료는 사진 준비부터 완료 callback까지 순서대로 실행한다", async () => {
  const calls = [];
  const result = {
    roomId: "room-1",
    status: "ENDED",
    endedAt: "2026-09-05T12:00:00.000Z",
    savedImages: [],
  };

  const completion = await executeRtcHostTermination({
    existingResult: null,
    preparePhotos: async () => calls.push("prepare"),
    stopPublishing: async () => calls.push("stop"),
    endRoom: async () => {
      calls.push("end");
      return result;
    },
    deliverResult: async () => calls.push("deliver"),
    disconnectRoom: async () => calls.push("disconnect"),
    isMounted: () => true,
    onCompleted: () => calls.push("complete"),
    onRoomEnded: () => calls.push("cache-result"),
    onStateChange: (state) => calls.push(state),
  });

  assert.deepEqual(completion, { status: "COMPLETED" });
  assert.deepEqual(calls, [
    "PREPARING_PHOTOS",
    "prepare",
    "ENDING_ROOM",
    "stop",
    "end",
    "cache-result",
    "DELIVERING_RESULT",
    "deliver",
    "stop",
    "disconnect",
    "complete",
  ]);
});

for (const failureStage of [
  "RESULT_DELIVERY",
  "PUBLISHER_CLEANUP",
  "ROOM_DISCONNECT",
]) {
  test(`${failureStage} 실패는 Host 종료 완료를 막지 않는다`, async () => {
    const calls = [];
    const diagnostics = [];
    let stopCallCount = 0;
    const expectedError = new Error(`${failureStage} failed`);
    const result = {
      roomId: "room-1",
      status: "ENDED",
      endedAt: "2026-09-05T12:00:00.000Z",
      savedImages: [],
    };

    const completion = await executeRtcHostTermination({
      existingResult: null,
      preparePhotos: async () => calls.push("prepare"),
      stopPublishing: async () => {
        stopCallCount += 1;
        calls.push(`stop-${stopCallCount}`);
        if (failureStage === "PUBLISHER_CLEANUP" && stopCallCount === 2) {
          throw expectedError;
        }
      },
      endRoom: async () => {
        calls.push("end");
        return result;
      },
      deliverResult: async () => {
        calls.push("deliver");
        if (failureStage === "RESULT_DELIVERY") throw expectedError;
      },
      disconnectRoom: async () => {
        calls.push("disconnect");
        if (failureStage === "ROOM_DISCONNECT") throw expectedError;
      },
      isMounted: () => true,
      onCompleted: () => calls.push("complete"),
      onRoomEnded: () => calls.push("cache-result"),
      onNonFatalError: (stage, error) => diagnostics.push([stage, error]),
    });

    assert.deepEqual(completion, { status: "COMPLETED" });
    assert.deepEqual(diagnostics, [[failureStage, expectedError]]);
    assert.deepEqual(calls, [
      "prepare",
      "stop-1",
      "end",
      "cache-result",
      "deliver",
      "stop-2",
      "disconnect",
      "complete",
    ]);
  });
}

test("Host 종료 완료 callback 실패를 lifecycle 실패로 반환한다", async () => {
  const expectedError = new Error("결과 화면 전환 실패");
  const result = await completeRtcHostTermination({
    result: {
      roomId: "room-1",
      status: "ENDED",
      endedAt: "2026-09-02T12:00:00.000Z",
      savedImages: [],
    },
    isMounted: () => true,
    onCompleted: async () => {
      throw expectedError;
    },
  });

  assert.deepEqual(result, { status: "FAILED", error: expectedError });
});

test("Host 종료 cleanup 중 unmount되면 완료 callback을 실행하지 않는다", async () => {
  let completed = false;
  const result = await completeRtcHostTermination({
    result: {
      roomId: "room-1",
      status: "ENDED",
      endedAt: "2026-09-02T12:00:00.000Z",
      savedImages: [],
    },
    isMounted: () => false,
    onCompleted: () => {
      completed = true;
    },
  });

  assert.deepEqual(result, { status: "SKIPPED" });
  assert.equal(completed, false);
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

  parser.push('event: participants\ndata: {"roomId":"room-1",');
  parser.push(
    '"status":"LIVE","participants":[{"nickname":"민지","role":"VIEWER","profileImage":null}]}\n\n',
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
