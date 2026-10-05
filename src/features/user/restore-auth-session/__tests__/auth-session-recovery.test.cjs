const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
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

const secureValues = new Map();
let secureStoreReadError = null;
let accessTokenExpired = false;
let refreshError = null;
let refreshResponse = { accessToken: "refreshed-access-token" };
const calls = {
  begin: 0,
  fail: 0,
  finishWithoutSession: 0,
  logout: 0,
  refresh: [],
  restore: [],
  setRefreshedAccessToken: [],
};

const authState = {
  termsAgreed: true,
  beginAuthRecovery: () => {
    calls.begin += 1;
  },
  failAuthRecovery: () => {
    calls.fail += 1;
  },
  finishAuthRecoveryWithoutSession: () => {
    calls.finishWithoutSession += 1;
  },
  logout: async () => {
    calls.logout += 1;
  },
  restorePersistedSession: (accessToken) => {
    calls.restore.push(accessToken);
  },
  setRefreshedAccessToken: async (session) => {
    calls.setRefreshedAccessToken.push(session);
  },
};

const secureStoreMock = {
  getItemAsync: async (key) => {
    if (secureStoreReadError) throw secureStoreReadError;
    return secureValues.get(key) ?? null;
  },
};

const isTerminalAuthRefreshError = (error) => {
  const status = error?.response?.status;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
};

const originalLoad = Module._load;
Module._load = function loadWithAuthRecoveryDependencies(
  request,
  parent,
  isMain,
) {
  if (request === "expo-secure-store") return secureStoreMock;
  if (request === "@shared/api") {
    return {
      AUTH_ACCESS_TOKEN_EXPIRY_LEEWAY_MS: 30_000,
      isTerminalAuthRefreshError,
      refreshAuthSession: async (options) => {
        calls.refresh.push(options);
        if (refreshError) throw refreshError;
        return refreshResponse;
      },
    };
  }
  if (request === "@shared/lib/jwt") {
    return {
      decodeAccessToken: {
        isExpired: () => accessTokenExpired,
      },
    };
  }
  if (request === "@shared/model") {
    return {
      AUTH_SESSION_STORAGE_KEYS: {
        ACCESS_TOKEN: "accessToken",
        REFRESH_TOKEN: "refreshToken",
      },
      useAuthStore: {
        getState: () => authState,
      },
    };
  }
  if (request === "./tokens") {
    return {
      requestTokenRefresh: async () => {
        if (refreshError) throw refreshError;
        return refreshResponse;
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const recoveryModule = require(
  path.resolve(__dirname, "../model/recover-auth-session.ts"),
);
const refreshModule = require(
  path.resolve(__dirname, "../../../../shared/api/refresh-auth-session.ts"),
);
Module._load = originalLoad;

const reset = () => {
  secureValues.clear();
  secureStoreReadError = null;
  accessTokenExpired = false;
  refreshError = null;
  refreshResponse = { accessToken: "refreshed-access-token" };
  authState.termsAgreed = true;
  calls.begin = 0;
  calls.fail = 0;
  calls.finishWithoutSession = 0;
  calls.logout = 0;
  calls.refresh.length = 0;
  calls.restore.length = 0;
  calls.setRefreshedAccessToken.length = 0;
};

test("유효한 access/refresh token은 네트워크 요청 없이 세션을 복원한다", async () => {
  reset();
  secureValues.set("accessToken", "valid-access-token");
  secureValues.set("refreshToken", "valid-refresh-token");

  await recoveryModule.recoverAuthSession();

  assert.equal(calls.begin, 1);
  assert.deepEqual(calls.restore, ["valid-access-token"]);
  assert.equal(calls.refresh.length, 0);
});

test("만료된 access token은 화면 진입 전에 refresh한다", async () => {
  reset();
  accessTokenExpired = true;
  secureValues.set("accessToken", "expired-access-token");
  secureValues.set("refreshToken", "valid-refresh-token");

  await recoveryModule.recoverAuthSession();

  assert.deepEqual(calls.refresh, [
    { refreshToken: "valid-refresh-token", termsAgreed: true },
  ]);
  assert.equal(calls.fail, 0);
});

test("refresh token만 남아 있어도 새 access token으로 복구를 시도한다", async () => {
  reset();
  secureValues.set("refreshToken", "valid-refresh-token");

  await recoveryModule.recoverAuthSession();

  assert.deepEqual(calls.refresh, [
    { refreshToken: "valid-refresh-token", termsAgreed: true },
  ]);
  assert.equal(calls.logout, 0);
});

test("저장된 token이 없으면 비로그인 초기화를 완료한다", async () => {
  reset();

  await recoveryModule.recoverAuthSession();

  assert.equal(calls.finishWithoutSession, 1);
  assert.equal(calls.logout, 0);
});

test("세션 복구 중 일시적인 서버 오류는 token을 지우지 않고 재시도 상태로 남긴다", async () => {
  reset();
  accessTokenExpired = true;
  refreshError = { response: { status: 500 } };
  secureValues.set("accessToken", "expired-access-token");
  secureValues.set("refreshToken", "valid-refresh-token");

  await recoveryModule.recoverAuthSession();

  assert.equal(calls.fail, 1);
  assert.equal(calls.logout, 0);
});

test("세션 복구 중 refresh 401은 재시도 상태가 아니라 terminal 오류로 처리한다", async () => {
  reset();
  accessTokenExpired = true;
  refreshError = { response: { status: 401 } };
  secureValues.set("accessToken", "expired-access-token");
  secureValues.set("refreshToken", "invalid-refresh-token");

  await recoveryModule.recoverAuthSession();

  assert.equal(calls.fail, 0);
});

test("access token만 남은 불완전 세션은 명시적으로 정리한다", async () => {
  reset();
  secureValues.set("accessToken", "orphaned-access-token");

  await recoveryModule.recoverAuthSession();

  assert.equal(calls.logout, 1);
  assert.equal(calls.restore.length, 0);
});

test("SecureStore 읽기 실패는 로그아웃 대신 재시도 상태로 남긴다", async () => {
  reset();
  secureStoreReadError = new Error("SecureStore unavailable");

  await recoveryModule.recoverAuthSession();

  assert.equal(calls.fail, 1);
  assert.equal(calls.logout, 0);
});

test("runtime token refresh의 네트워크 오류는 기존 session을 보존한다", async () => {
  reset();
  refreshError = new Error("Network Error");

  await assert.rejects(
    refreshModule.refreshAuthSession({ refreshToken: "refresh-token" }),
    /Network Error/,
  );

  assert.equal(calls.logout, 0);
  assert.equal(calls.setRefreshedAccessToken.length, 0);
});

test("runtime token refresh가 401이면 만료된 session을 정리한다", async () => {
  reset();
  refreshError = { response: { status: 401 } };

  await assert.rejects(
    refreshModule.refreshAuthSession({ refreshToken: "refresh-token" }),
  );

  assert.equal(calls.logout, 1);
});

test("runtime token refresh가 429이면 session을 보존한다", async () => {
  reset();
  refreshError = { response: { status: 429 } };

  await assert.rejects(
    refreshModule.refreshAuthSession({ refreshToken: "refresh-token" }),
  );

  assert.equal(calls.logout, 0);
});

test("refresh token이 없으면 지속 불가능한 session을 정리한다", async () => {
  reset();

  await assert.rejects(refreshModule.refreshAuthSession(), {
    name: "MissingRefreshTokenError",
  });

  assert.equal(calls.logout, 1);
});

test("runtime token refresh 성공 시 access token만 갱신한다", async () => {
  reset();

  await refreshModule.refreshAuthSession({ refreshToken: "refresh-token" });

  assert.deepEqual(calls.setRefreshedAccessToken, [
    { accessToken: "refreshed-access-token", termsAgreed: true },
  ]);
});
