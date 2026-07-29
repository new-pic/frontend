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
  RtcStoredPhotoListResponseSchema,
} = require("../../../../entities/rtc-stored-photo/model/schema.ts");
const {
  filterActiveRtcStoredPhotos,
  getNextRtcStoredPhotoExpiryDelay,
  mergeUniqueRtcStoredPhotos,
} = require("../lib/rtc-stored-photo-visibility.ts");

function createPhoto({
  id,
  roomId = "room-1",
  createdAt = "2026-07-29T00:00:00.000Z",
  expiresAt = "2026-07-30T00:00:00.000Z",
}) {
  return {
    id,
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    roomId,
    createdAt,
    expiresAt,
  };
}

test("서버 목록 DTO를 검증하면서 roomId와 nextCursor를 보존한다", () => {
  const parsed = RtcStoredPhotoListResponseSchema.parse({
    items: [
      createPhoto({
        id: "photo-1",
        roomId: "room-session-a",
      }),
    ],
    nextCursor: "photo-1",
  });

  assert.equal(parsed.items[0].roomId, "room-session-a");
  assert.equal(parsed.nextCursor, "photo-1");
});

test("내 사진 API가 nextCursor를 생략해도 마지막 페이지로 해석한다", () => {
  const parsed = RtcStoredPhotoListResponseSchema.parse({
    items: [createPhoto({ id: "photo-last" })],
  });

  assert.equal(parsed.nextCursor, null);
});

test("서버 expiresAt이 지난 사진만 화면 목록에서 제외한다", () => {
  const nowMs = Date.parse("2026-07-29T12:00:00.000Z");
  const photos = [
    createPhoto({
      id: "expired",
      expiresAt: "2026-07-29T11:59:59.999Z",
    }),
    createPhoto({
      id: "active",
      expiresAt: "2026-07-29T12:00:01.000Z",
    }),
  ];

  assert.deepEqual(
    filterActiveRtcStoredPhotos(photos, nowMs).map(({ id }) => id),
    ["active"],
  );
});

test("가장 가까운 서버 만료 시점까지만 타이머 지연을 계산한다", () => {
  const nowMs = Date.parse("2026-07-29T12:00:00.000Z");
  const photos = [
    createPhoto({
      id: "later",
      expiresAt: "2026-07-29T12:00:10.000Z",
    }),
    createPhoto({
      id: "nearest",
      expiresAt: "2026-07-29T12:00:03.500Z",
    }),
  ];

  assert.equal(
    getNextRtcStoredPhotoExpiryDelay(photos, nowMs),
    3_500,
  );
  assert.equal(
    getNextRtcStoredPhotoExpiryDelay([], nowMs),
    null,
  );
});

test("cursor 페이지를 순서대로 병합하고 중복 사진을 한 번만 유지한다", () => {
  const first = createPhoto({ id: "photo-1" });
  const second = createPhoto({
    id: "photo-2",
    roomId: "room-2",
  });

  const merged = mergeUniqueRtcStoredPhotos([
    { items: [first, second] },
    { items: [second] },
  ]);

  assert.deepEqual(
    merged.map(({ id, roomId }) => ({ id, roomId })),
    [
      { id: "photo-1", roomId: "room-1" },
      { id: "photo-2", roomId: "room-2" },
    ],
  );
});
