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
  shouldShowProfileRtcPhotoPreview,
} = require("../model/profile-rtc-photo-preview-visibility.ts");

test("사진 미리보기는 조회 성공 후 표시 가능한 사진이 있을 때만 보인다", () => {
  assert.equal(
    shouldShowProfileRtcPhotoPreview({
      isQuerySuccess: false,
      hasDisplayablePhoto: false,
    }),
    false,
  );
  assert.equal(
    shouldShowProfileRtcPhotoPreview({
      isQuerySuccess: true,
      hasDisplayablePhoto: false,
    }),
    false,
  );
  assert.equal(
    shouldShowProfileRtcPhotoPreview({
      isQuerySuccess: true,
      hasDisplayablePhoto: true,
    }),
    true,
  );
});

test("프로필 하위 화면은 탭 sibling이 아니라 Profile Stack에 속한다", () => {
  const tabsLayout = readSource("../../../app/(tabs)/_layout.tsx");
  const profileLayout = readSource("../../../app/(tabs)/profile/_layout.tsx");

  assert.match(profileLayout, /<Stack/);
  assert.doesNotMatch(tabsLayout, /name="profile\/rtc-photos"/);
  assert.doesNotMatch(tabsLayout, /name="profile\/edit"/);
  assert.doesNotMatch(tabsLayout, /name="profile\/\(feed\)\/my"/);
  assert.match(tabsLayout, /pathname === "\/profile"/);
  assert.match(tabsLayout, /\{ display: "none" \}/);
});

test("최근 촬영 사진은 grid에서 선택한 사진으로 공용 갤러리를 연다", () => {
  const source = readSource("../ui/profile-rtc-photo-page.tsx");

  assert.match(source, /onPress=\{\(_, index\) => setGalleryIndex\(index\)\}/);
  assert.match(source, /<PhotoGalleryModal/);
  assert.match(source, /initialIndex=\{galleryIndex \?\? 0\}/);
});

test("최근 촬영 사진 상세는 만료 안내와 촬영 시각 및 다운로드를 제공한다", () => {
  const source = readSource("../ui/profile-rtc-photo-page.tsx");
  const mediaSource = readSource(
    "../../../shared/lib/media/save-image-to-media-library.ts",
  );

  assert.match(source, /renderHeaderRight/);
  assert.match(source, /IconDownload/);
  assert.match(source, /RtcStoredPhotoExpiryBadge/);
  assert.match(source, /expiresAt=\{activeImage\.expiresAt\}/);
  assert.match(source, /RtcStoredPhotoCreatedAt/);
  assert.match(source, /createdAt=\{activeImage\.createdAt\}/);
  assert.match(mediaSource, /File\.downloadFileAsync/);
  assert.match(mediaSource, /MediaLibrary\.Asset\.create/);
  assert.match(mediaSource, /temporaryFile\.delete\(\)/);
});

test("버그 제보 메뉴는 공용 외부 링크를 연다", () => {
  const profileSource = readSource("../ui/profile-page.tsx");
  const externalLinksSource = readSource(
    "../../../shared/config/external-links.ts",
  );

  assert.match(
    externalLinksSource,
    /BUG_REPORT:[\s\S]*"https:\/\/working-skunk-fbd\.notion\.site\/3bbfdee90e2f809f9160e46dd034b6f0"/,
  );
  assert.match(profileSource, /Linking\.openURL\(EXTERNAL_LINKS\.BUG_REPORT\)/);
  assert.match(profileSource, /accessibilityRole="link"/);
});

test("서비스 약관 메뉴는 공용 외부 링크를 연다", () => {
  const profileSource = readSource("../ui/profile-page.tsx");
  const externalLinksSource = readSource(
    "../../../shared/config/external-links.ts",
  );

  assert.match(
    externalLinksSource,
    /TERMS_OF_SERVICE:[\s\S]*"https:\/\/working-skunk-fbd\.notion\.site\/newpic-3affdee90e2f807385e3ded6fe4ac37a"/,
  );
  assert.match(
    profileSource,
    /Linking\.openURL\(EXTERNAL_LINKS\.TERMS_OF_SERVICE\)/,
  );
  assert.match(profileSource, /onPress=\{handleOpenTermsOfService\}/);
});

test("프로필 하단 메뉴는 모바일 기본 텍스트 크기를 사용한다", () => {
  const source = readSource("../ui/profile-page.tsx");

  for (const label of [
    "도움말",
    "버그 제보하기",
    "서비스 약관",
    "차단한 사용자",
    "로그아웃",
    "회원 탈퇴",
  ]) {
    assert.match(source, new RegExp(`size="md"[^>]*>\\s*${label}\\s*<`));
  }
});

test("회원 탈퇴 메뉴는 로그인한 비게스트 회원에게만 로그아웃 아래 표시된다", () => {
  const source = readSource("../ui/profile-page.tsx");

  assert.match(source, /isAuthenticated && !isGuest/);
  assert.match(source, /로그아웃[\s\S]*회원 탈퇴/);
  assert.match(source, /disabled=\{isDeleting\}/);
  assert.match(source, /onPress=\{deleteAccount\}/);
});

test("회원 탈퇴는 유예 API 성공 후 세션을 종료하고 App이 Query cache를 정리한다", () => {
  const querySource = readSource(
    "../../../features/user/delete-account/api/delete-account-mutation.ts",
  );
  const featureSource = readSource(
    "../../../features/user/delete-account/model/use-delete-account.ts",
  );
  const appLayoutSource = readSource("../../../app/_layout.tsx");

  assert.match(querySource, /privateApiClient\.delete\("\/users\/me"\)/);
  assert.match(featureSource, /계정과 작성 데이터는 30일 후 삭제됩니다/);
  assert.match(
    featureSource,
    /await mutateAsync\(\)[\s\S]*await logout\(\)[\s\S]*router\.replace\("\/"\)/,
  );
  assert.doesNotMatch(featureSource, /useQueryClient|queryClient\.clear/);
  assert.match(
    appLayoutSource,
    /useAuthStore\.subscribe\(\(state, previousState\)[\s\S]*state\.userId !== previousState\.userId[\s\S]*queryClient\.clear\(\)/,
  );
});

test("이미 탈퇴 유예 중인 응답은 완료 상태로 정규화한다", () => {
  const querySource = readSource(
    "../../../features/user/delete-account/api/delete-account-mutation.ts",
  );

  assert.match(
    querySource,
    /ACCOUNT_WITHDRAWAL_PENDING_MESSAGE = "탈퇴 유예 중"/,
  );
  assert.match(
    querySource,
    /if \(isAccountWithdrawalPendingError\(error\)\) return;/,
  );
  assert.match(querySource, /throw error;/);
});
