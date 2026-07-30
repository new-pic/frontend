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
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  AUTH_ENTRY_INTENT,
  shouldLeaveAuthEntry,
} = require("../auth-entry-intent.ts");
const {
  resolveStableDeviceUuid,
} = require("../../lib/device-uuid-policy.ts");
const {
  getSocialLoginRequestMode,
  SOCIAL_LOGIN_REQUEST_MODE,
} = require("../../../entities/user/model/social-login-request-mode.ts");

test("게스트 계정 연결 intent는 token을 유지해도 Welcome을 떠나지 않는다", () => {
  assert.equal(
    shouldLeaveAuthEntry(
      "guest-access-token",
      AUTH_ENTRY_INTENT.LINK_GUEST_ACCOUNT,
    ),
    false,
  );
  assert.equal(
    shouldLeaveAuthEntry(
      "member-access-token",
      AUTH_ENTRY_INTENT.DEFAULT,
    ),
    true,
  );
  assert.equal(
    shouldLeaveAuthEntry(null, AUTH_ENTRY_INTENT.DEFAULT),
    false,
  );
});

test("게스트의 소셜 로그인은 인증된 계정 연결 요청을 사용한다", () => {
  assert.equal(
    getSocialLoginRequestMode(true),
    SOCIAL_LOGIN_REQUEST_MODE.AUTHENTICATED_ACCOUNT_LINK,
  );
  assert.equal(
    getSocialLoginRequestMode(false),
    SOCIAL_LOGIN_REQUEST_MODE.PUBLIC,
  );
});

test("저장된 deviceId가 있으면 새 ID를 만들지 않는다", async () => {
  let createCount = 0;
  let persistCount = 0;
  const deviceUuid = await resolveStableDeviceUuid({
    read: async () => "stored-device-id",
    create: () => {
      createCount += 1;
      return "new-device-id";
    },
    persist: async () => {
      persistCount += 1;
    },
  });

  assert.equal(deviceUuid, "stored-device-id");
  assert.equal(createCount, 0);
  assert.equal(persistCount, 0);
});

test("새 deviceId는 저장에 성공한 뒤에만 반환한다", async () => {
  let persistedDeviceUuid = null;
  const deviceUuid = await resolveStableDeviceUuid({
    read: async () => null,
    create: () => "new-device-id",
    persist: async (value) => {
      persistedDeviceUuid = value;
    },
  });

  assert.equal(deviceUuid, "new-device-id");
  assert.equal(persistedDeviceUuid, "new-device-id");

  await assert.rejects(
    resolveStableDeviceUuid({
      read: async () => null,
      create: () => "ephemeral-device-id",
      persist: async () => {
        throw new Error("SecureStore unavailable");
      },
    }),
    /SecureStore unavailable/,
  );
});
