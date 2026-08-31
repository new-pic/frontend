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
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const secureValues = new Map();
const originalModuleLoad = Module._load;
Module._load = function mockAuthDependencies(request, parent, isMain) {
  if (request === "expo-secure-store") {
    return {
      deleteItemAsync: async (key) => secureValues.delete(key),
      getItemAsync: async (key) => secureValues.get(key) ?? null,
      setItemAsync: async (key, value) => secureValues.set(key, value),
    };
  }
  if (request === "@shared/lib/jwt") {
    return {
      decodeAccessToken: {
        userId: () => "test-user-id",
        userType: (token) => (token.includes("guest") ? "GUEST" : "USER"),
      },
    };
  }
  return originalModuleLoad.call(this, request, parent, isMain);
};

const {
  AppleLoginRequestSchema,
  GoogleLoginRequestSchema,
  GuestLoginRequestSchema,
  SocialLoginResponseSchema,
  TokenResponseSchema,
} = require("../model/social-login-schema.ts");
const { useAuthStore } = require("../../../../shared/model/auth-store.ts");

Module._load = originalModuleLoad;

const projectRoot = path.resolve(__dirname, "../../../../../");
const readSource = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

test.beforeEach(() => {
  secureValues.clear();
  useAuthStore.setState({
    accessToken: null,
    userId: null,
    isGuest: false,
    isInitialized: false,
    termsAgreed: false,
  });
});

test("Apple, Google과 Guest 로그인 요청은 termsAgreed가 필수다", () => {
  assert.equal(
    AppleLoginRequestSchema.safeParse({
      identityToken: "apple-identity-token",
      termsAgreed: true,
    }).success,
    true,
  );
  assert.equal(
    AppleLoginRequestSchema.safeParse({
      identityToken: "apple-identity-token",
    }).success,
    false,
  );
  assert.equal(
    GoogleLoginRequestSchema.safeParse({
      idToken: "google-id-token",
      termsAgreed: true,
    }).success,
    true,
  );
  assert.equal(
    GuestLoginRequestSchema.safeParse({
      deviceId: "device-id",
      termsAgreed: true,
    }).success,
    true,
  );
  assert.equal(
    GoogleLoginRequestSchema.safeParse({ idToken: "google-id-token" }).success,
    false,
  );
  assert.equal(
    GuestLoginRequestSchema.safeParse({ deviceId: "device-id" }).success,
    false,
  );
});

test("소셜 로그인 응답은 공통 계약과 status를 검증한다", () => {
  const tokenResponse = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    termsAgreed: true,
  };

  assert.equal(TokenResponseSchema.safeParse(tokenResponse).success, true);
  for (const status of [
    "LOGIN_SUCCESS",
    "NEED_NICKNAME",
    "ACCOUNT_RECOVERED",
  ]) {
    assert.equal(
      SocialLoginResponseSchema.safeParse({ ...tokenResponse, status }).success,
      true,
    );
  }
  assert.equal(
    TokenResponseSchema.safeParse({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    }).success,
    false,
  );
});

test("동의하지 않은 세션은 토큰을 저장하지 않는다", async () => {
  await assert.rejects(
    useAuthStore.getState().setSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      termsAgreed: false,
    }),
    /Terms agreement is required/,
  );

  assert.equal(secureValues.size, 0);
  assert.equal(useAuthStore.getState().accessToken, null);
});

test("저장된 토큰은 약관 동의가 완료된 세션으로 복원한다", async () => {
  secureValues.set("accessToken", "guest-access-token");

  await useAuthStore.getState().initializeAuthState();

  assert.equal(useAuthStore.getState().termsAgreed, true);
  assert.equal(useAuthStore.getState().accessToken, "guest-access-token");
  assert.equal(useAuthStore.getState().userId, "test-user-id");
  assert.equal(useAuthStore.getState().isGuest, true);
});

test("활성 세션에서는 약관 동의 상태를 해제할 수 없다", async () => {
  await useAuthStore.getState().setSession({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    termsAgreed: true,
  });

  useAuthStore.getState().setTermsAgreed(false);

  assert.equal(useAuthStore.getState().termsAgreed, true);
});

test("로그아웃하면 약관 동의 상태도 초기화한다", async () => {
  await useAuthStore.getState().setSession({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    termsAgreed: true,
  });

  await useAuthStore.getState().logout();

  assert.equal(useAuthStore.getState().termsAgreed, false);
  assert.equal(secureValues.has("accessToken"), false);
  assert.equal(secureValues.has("refreshToken"), false);
});

test("Welcome UI와 로그인 use-case가 동의 전 요청을 이중 차단한다", () => {
  const welcomeSource = readSource("src/pages/welcome/ui/welcome-page.tsx");
  const loginSource = readSource(
    "src/features/user/save-social-login/model/use-social-login.ts",
  );

  assert.equal(
    (welcomeSource.match(/if \(!ensureTermsAgreed\(\)\) return;/g) ?? [])
      .length,
    1,
  );
  assert.equal((welcomeSource.match(/handleLogin\(\{/g) ?? []).length, 3);
  assert.equal(
    (welcomeSource.match(/return handleLogin\(\{/g) ?? []).length,
    3,
  );
  assert.match(
    welcomeSource,
    /const ensureTermsAgreed = \(\) => \{[\s\S]*openTermsSheet\(\);[\s\S]*return false;/,
  );
  assert.equal((loginSource.match(/if \(!termsAgreed\)/g) ?? []).length, 1);
  assert.match(
    loginSource,
    /const beginLogin = \(provider: LoginProvider\) => \{[\s\S]*if \(!termsAgreed\)[\s\S]*loginLockRef\.current = true;[\s\S]*setActiveLoginProvider\(provider\)/,
  );
  const openTermsHandler = welcomeSource.match(
    /const handleOpenTermsOfService = async \(\) => \{[\s\S]*?\n  \};/,
  );
  assert.ok(openTermsHandler);
  assert.match(
    openTermsHandler[0],
    /Linking\.openURL\(EXTERNAL_LINKS\.TERMS_OF_SERVICE\)/,
  );
  assert.doesNotMatch(openTermsHandler[0], /setTermsAgreed/);
});

test("약관 안내 Card는 공용 테두리를 사용하고 체크박스 label은 Medium 굵기를 유지한다", () => {
  const welcomeSource = readSource("src/pages/welcome/ui/welcome-page.tsx");
  const checkboxSource = readSource("src/shared/ui/checkbox/index.tsx");

  assert.match(
    welcomeSource,
    /<Card size="sm" className="gap-3 border-outline shadow-none">/,
  );
  assert.match(
    checkboxSource,
    /checkboxLabelStyle = tva\(\{[\s\S]*font-medium/,
  );
  assert.doesNotMatch(
    checkboxSource,
    /checkboxLabelStyle = tva\(\{[\s\S]*font-sans/,
  );
});

test("약관 동의는 BottomSheet에서 명시적으로 확정한다", () => {
  const welcomeSource = readSource("src/pages/welcome/ui/welcome-page.tsx");

  assert.match(welcomeSource, /<BottomSheetModal/);
  assert.match(welcomeSource, /open=\{isTermsSheetOpen\}/);
  assert.match(welcomeSource, /snapPoints=\{\["75%", "100%"\]\}/);
  assert.match(
    welcomeSource,
    /if \(!hasExistingSession && !termsAgreed\) \{[\s\S]*setIsTermsSheetOpen\(true\)/,
  );
  assert.match(welcomeSource, /isChecked=\{draftTermsAgreed\}/);
  assert.match(welcomeSource, /onChange=\{setDraftTermsAgreed\}/);
  assert.match(
    welcomeSource,
    /const handleAcceptTerms = \(\) => \{[\s\S]*setTermsAgreed\(true\);[\s\S]*setIsTermsSheetOpen\(false\)/,
  );
  assert.match(
    welcomeSource,
    /<Button[\s\S]*className="w-full h-12\.5 p-0 rounded-xl"[\s\S]*<ButtonText size="lg" className="font-semibold">[\s\S]*동의하고 계속/,
  );
});

test("Apple 로그인은 iOS 지원 여부를 확인하고 시스템 인증 결과를 서버에 전달한다", () => {
  const welcomeSource = readSource("src/pages/welcome/ui/welcome-page.tsx");
  const loginSource = readSource(
    "src/features/user/save-social-login/model/use-social-login.ts",
  );
  const authQuerySource = readSource(
    "src/features/user/save-social-login/api/social-login-mutation.ts",
  );
  const appConfig = JSON.parse(readSource("app.json"));

  assert.match(welcomeSource, /appleLogin\.isAvailable \? \(/);
  assert.match(welcomeSource, /<AppleLogo width=\{24\} height=\{24\} \/>/);
  assert.match(
    welcomeSource,
    /<ButtonText className="text-white">[\s\S]*애플로 시작하기[\s\S]*<\/ButtonText>/,
  );
  assert.match(loginSource, /Platform\.OS !== "ios"/);
  assert.match(loginSource, /AppleAuthentication\.isAvailableAsync\(\)/);
  assert.match(loginSource, /AppleAuthentication\.signInAsync\(/);
  assert.match(loginSource, /ERR_REQUEST_CANCELED/);
  assert.match(loginSource, /useState<LoginProvider \| null>\(null\)/);
  assert.match(loginSource, /beginLogin\("apple"\)/);
  assert.match(loginSource, /beginLogin\("google"\)/);
  assert.match(loginSource, /beginLogin\("guest"\)/);
  assert.match(loginSource, /isLoading: activeLoginProvider === "apple"/);
  assert.match(loginSource, /isLoading: activeLoginProvider === "google"/);
  assert.match(loginSource, /isLoading: activeLoginProvider === "guest"/);
  assert.match(welcomeSource, /<ButtonSpinner color="white" \/>/);
  assert.match(authQuerySource, /post\(\s*"\/auth\/apple",\s*request/);
  assert.equal(appConfig.expo.ios.usesAppleSignIn, true);
  assert.equal(
    appConfig.expo.plugins.includes("expo-apple-authentication"),
    true,
  );
});

test("Apple과 Google 로그인은 세션 저장과 후속 이동을 공유한다", () => {
  const loginSource = readSource(
    "src/features/user/save-social-login/model/use-social-login.ts",
  );

  assert.match(
    loginSource,
    /const completeSocialLogin = async \([\s\S]*response: SocialLoginResponse,[\s\S]*isLinkingGuestAccount: boolean/,
  );
  assert.equal(
    (loginSource.match(/await completeSocialLogin\(/g) ?? []).length,
    2,
  );
  assert.equal((loginSource.match(/await setSession\(\{/g) ?? []).length, 2);
  assert.equal(
    (loginSource.match(/response\.status === "NEED_NICKNAME"/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(loginSource, /resetCurrentUser/);
});

test("Welcome은 진입 시 약관 핵심 내용과 명시적 동의 UI를 표시한다", () => {
  const welcomeSource = readSource("src/pages/welcome/ui/welcome-page.tsx");

  assert.match(welcomeSource, /<ScrollView/);
  assert.match(
    welcomeSource,
    /NewPic 서비스를 시작하기 전에 아래 내용을 확인해주세요/,
  );
  assert.match(welcomeSource, /소셜 로그인 정보 또는 기기/);
  assert.match(welcomeSource, /촬영하거나 업로드한 사진과 작성한 피드·댓글/);
  assert.match(welcomeSource, /수집 항목, 이용 목적, 보관 기간 및 삭제 방법/);
  assert.match(welcomeSource, /이용약관 및 개인정보 처리방침 전문 보기/);
  assert.match(welcomeSource, /\(필수\) 위 내용을 확인했으며/);
  assert.match(welcomeSource, /onChange=\{setDraftTermsAgreed\}/);
  assert.match(
    welcomeSource,
    /accessibilityLabel="이용약관 및 개인정보 처리방침 보기"/,
  );
  assert.doesNotMatch(welcomeSource, /className="absolute bottom-0/);
});
