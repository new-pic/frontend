const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
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

const requestedKeys = [];
const storedEntries = [];
let rejectedDeleteKey = null;
let rejectedSetKey = null;
const secureStoreMock = {
  deleteItemAsync: async (key) => {
    requestedKeys.push(key);
    if (key === rejectedDeleteKey) {
      throw new Error(`${key} deletion failed`);
    }
  },
  setItemAsync: async (key, value) => {
    storedEntries.push([key, value]);
    if (key === rejectedSetKey) {
      throw new Error(`${key} persistence failed`);
    }
  },
};

const originalLoad = Module._load;
Module._load = function loadWithAuthDependencies(request, parent, isMain) {
  if (request === "expo-secure-store") return secureStoreMock;
  if (request === "@shared/lib/jwt") {
    return {
      decodeAccessToken: {
        userId: () => "new-member-id",
        userType: () => "MEMBER",
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { AUTH_SESSION_STORAGE_KEYS } = require("../auth-session-storage.ts");
const { useAuthStore } = require("../auth-store.ts");
Module._load = originalLoad;

const seedAuthenticatedState = () => {
  requestedKeys.length = 0;
  storedEntries.length = 0;
  rejectedDeleteKey = null;
  rejectedSetKey = null;
  useAuthStore.setState({
    accessToken: "persisted-access-token",
    userId: "member-id",
    isGuest: false,
    isInitialized: true,
    termsAgreed: true,
  });
};

const assertLoggedOutState = () => {
  const state = useAuthStore.getState();
  assert.equal(state.accessToken, null);
  assert.equal(state.userId, null);
  assert.equal(state.isGuest, false);
  assert.equal(state.isInitialized, true);
  assert.equal(state.termsAgreed, false);
};

test("access token 삭제가 실패해도 refresh token과 인증 상태를 정리한다", async () => {
  seedAuthenticatedState();
  rejectedDeleteKey = AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN;
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    await useAuthStore.getState().logout();
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(requestedKeys, [
    AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN,
    AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN,
  ]);
  assertLoggedOutState();
});

test("refresh token 삭제가 실패해도 access token과 인증 상태를 정리한다", async () => {
  seedAuthenticatedState();
  rejectedDeleteKey = AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN;
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    await useAuthStore.getState().logout();
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(requestedKeys, [
    AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN,
    AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN,
  ]);
  assertLoggedOutState();
});

test("두 token 저장이 모두 성공한 뒤 runtime session을 활성화한다", async () => {
  seedAuthenticatedState();

  await useAuthStore.getState().setSession({
    accessToken: "new-access-token",
    refreshToken: "new-refresh-token",
    termsAgreed: true,
  });

  assert.deepEqual(storedEntries, [
    [AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN, "new-access-token"],
    [AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN, "new-refresh-token"],
  ]);
  assert.deepEqual(requestedKeys, []);
  assert.equal(useAuthStore.getState().accessToken, "new-access-token");
  assert.equal(useAuthStore.getState().userId, "new-member-id");
});

test("access token 저장 실패 시 영속 session을 rollback하고 runtime session을 유지한다", async () => {
  seedAuthenticatedState();
  rejectedSetKey = AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN;

  await assert.rejects(
    useAuthStore.getState().setSession({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      termsAgreed: true,
    }),
    /accessToken persistence failed/,
  );

  assert.deepEqual(storedEntries, [
    [AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN, "new-access-token"],
  ]);
  assert.deepEqual(requestedKeys, [
    AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN,
    AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN,
  ]);
  assert.equal(useAuthStore.getState().accessToken, "persisted-access-token");
  assert.equal(useAuthStore.getState().userId, "member-id");
});

test("refresh token 저장 실패 시 일부 저장된 token을 rollback하고 runtime session을 유지한다", async () => {
  seedAuthenticatedState();
  rejectedSetKey = AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN;

  await assert.rejects(
    useAuthStore.getState().setSession({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      termsAgreed: true,
    }),
    /refreshToken persistence failed/,
  );

  assert.deepEqual(storedEntries, [
    [AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN, "new-access-token"],
    [AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN, "new-refresh-token"],
  ]);
  assert.deepEqual(requestedKeys, [
    AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN,
    AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN,
  ]);
  assert.equal(useAuthStore.getState().accessToken, "persisted-access-token");
  assert.equal(useAuthStore.getState().userId, "member-id");
});
