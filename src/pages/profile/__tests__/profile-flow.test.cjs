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
