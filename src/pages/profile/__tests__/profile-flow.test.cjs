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
  getUserQueryIdentity,
} = require("../../../entities/user/model/user-query-identity.ts");
const {
  shouldShowProfileRtcPhotoPreview,
} = require("../../../widgets/profile/rtc-photo-preview/model/preview-visibility.ts");

test("프로필 Query identity는 사용자별로 분리된다", () => {
  assert.equal(getUserQueryIdentity("guest-user"), "guest-user");
  assert.equal(getUserQueryIdentity("member-user"), "member-user");
  assert.equal(getUserQueryIdentity(null), "anonymous");
});

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
  const profileLayout = readSource(
    "../../../app/(tabs)/profile/_layout.tsx",
  );

  assert.match(profileLayout, /<Stack/);
  assert.doesNotMatch(tabsLayout, /name="profile\/rtc-photos"/);
  assert.doesNotMatch(tabsLayout, /name="profile\/edit"/);
  assert.doesNotMatch(tabsLayout, /name="profile\/\(feed\)\/my"/);
  assert.match(tabsLayout, /pathname === "\/profile"/);
  assert.match(tabsLayout, /\{ display: "none" \}/);
});

test("최근 촬영 사진은 grid에서 선택한 사진으로 공용 갤러리를 연다", () => {
  const source = readSource("../ui/profile-rtc-photo-page.tsx");

  assert.match(
    source,
    /onPress=\{\(_, index\) => setGalleryIndex\(index\)\}/,
  );
  assert.match(source, /<PhotoGalleryModal/);
  assert.match(source, /initialIndex=\{galleryIndex \?\? 0\}/);
});
