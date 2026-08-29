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
let rejectedKey = null;
const secureStoreMock = {
  deleteItemAsync: async (key) => {
    requestedKeys.push(key);
    if (key === rejectedKey) {
      throw new Error(`${key} deletion failed`);
    }
  },
};

const originalLoad = Module._load;
Module._load = function loadWithAuthDependencies(request, parent, isMain) {
  if (request === "expo-secure-store") return secureStoreMock;
  if (request === "@shared/lib/jwt") {
    return {
      decodeAccessToken: {
        userId: () => null,
        userType: () => null,
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
  useAuthStore.setState({
    accessToken: "persisted-access-token",
    userId: "member-id",
    isLoggedIn: true,
    isGuest: false,
    isInitialized: true,
    termsAgreed: true,
  });
};

const assertLoggedOutState = () => {
  const state = useAuthStore.getState();
  assert.equal(state.accessToken, null);
  assert.equal(state.userId, null);
  assert.equal(state.isLoggedIn, false);
  assert.equal(state.isGuest, false);
  assert.equal(state.isInitialized, true);
  assert.equal(state.termsAgreed, false);
};

test("access token 삭제가 실패해도 refresh token과 인증 상태를 정리한다", async () => {
  seedAuthenticatedState();
  rejectedKey = AUTH_SESSION_STORAGE_KEYS.ACCESS_TOKEN;
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
  rejectedKey = AUTH_SESSION_STORAGE_KEYS.REFRESH_TOKEN;
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
