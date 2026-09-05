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

let accessToken = "current-token";
let isExpired = false;
let logoutCount = 0;
let refreshCount = 0;

const originalLoad = Module._load;
Module._load = function loadWithAuthenticatedFetchDependencies(
  request,
  parent,
  isMain,
) {
  if (request === "@shared/model") {
    return {
      useAuthStore: {
        getState: () => ({
          accessToken,
          logout: async () => {
            logoutCount += 1;
            accessToken = null;
          },
        }),
      },
    };
  }
  if (request === "@shared/lib/jwt") {
    return {
      decodeAccessToken: {
        isExpired: () => isExpired,
      },
    };
  }
  if (request === "./refresh-auth-session") {
    return {
      refreshAuthSession: async () => {
        refreshCount += 1;
        accessToken = "refreshed-token";
        return { accessToken, refreshToken: "refresh-token" };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { executeAuthenticatedFetch, getFreshAccessToken } = require(
  path.resolve(__dirname, "../authenticated-fetch.ts"),
);
Module._load = originalLoad;

const resetState = () => {
  accessToken = "current-token";
  isExpired = false;
  logoutCount = 0;
  refreshCount = 0;
};

test("인증 fetch는 401 응답에 한 번만 token을 갱신하고 재요청한다", async () => {
  resetState();
  const requestedTokens = [];

  const response = await executeAuthenticatedFetch({
    request: async (token) => {
      requestedTokens.push(token);
      return new Response(null, {
        status: token === "current-token" ? 401 : 200,
      });
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(requestedTokens, ["current-token", "refreshed-token"]);
  assert.equal(refreshCount, 1);
  assert.equal(logoutCount, 0);
});

test("token 갱신 후에도 401이면 session을 종료한다", async () => {
  resetState();

  const response = await executeAuthenticatedFetch({
    request: async () => new Response(null, { status: 401 }),
  });

  assert.equal(response.status, 401);
  assert.equal(refreshCount, 1);
  assert.equal(logoutCount, 1);
});

test("Socket 연결용 token은 만료된 경우에만 연결 전에 갱신한다", async () => {
  resetState();

  assert.equal(await getFreshAccessToken(), "current-token");
  assert.equal(refreshCount, 0);

  isExpired = true;

  assert.equal(await getFreshAccessToken(), "refreshed-token");
  assert.equal(refreshCount, 1);
});
