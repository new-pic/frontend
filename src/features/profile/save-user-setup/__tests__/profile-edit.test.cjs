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

class MockFile {
  constructor(uri) {
    this.uri = uri;
  }
}

const originalModuleLoad = Module._load;
Module._load = function mockProfileDependencies(request, parent, isMain) {
  if (request === "expo-file-system") return { File: MockFile };
  return originalModuleLoad.call(this, request, parent, isMain);
};

const {
  UpdateProfileRequestSchema,
} = require("../model/profile-update-schema.ts");

Module._load = function mockProfileFeatureAliases(request, parent, isMain) {
  if (request === "@shared/lib") {
    return {
      uriToFile: async ({ uri }) => new MockFile(uri),
    };
  }
  if (request === "expo-file-system") return { File: MockFile };
  return originalModuleLoad.call(this, request, parent, isMain);
};

const {
  ProfileEditFormSchema,
} = require("../model/profile-edit-form-schema.ts");
const {
  getProfileImagePreviewUri,
  toSelectedProfileImage,
} = require("../lib/profile-image-picker-adapter.ts");
const {
  prepareProfileUpdateRequest,
} = require("../lib/prepare-profile-update-request.ts");

Module._load = originalModuleLoad;

test("프로필 이미지는 optional이고 닉네임만으로 제출할 수 있다", async () => {
  const formResult = ProfileEditFormSchema.safeParse({
    nickname: "뉴픽",
  });
  const requestResult = UpdateProfileRequestSchema.safeParse({
    nickname: "뉴픽",
  });

  assert.equal(formResult.success, true);
  assert.equal(requestResult.success, true);
  assert.deepEqual(await prepareProfileUpdateRequest(formResult.data), {
    nickname: "뉴픽",
  });
});

test("선택한 이미지는 제출 시 Expo File 요청으로 변환한다", async () => {
  const request = await prepareProfileUpdateRequest({
    nickname: "뉴픽",
    profileImageFile: {
      uri: "file:///cache/profile.jpg",
      fileName: "profile.jpg",
      mimeType: "image/jpeg",
    },
  });

  assert.equal(request.nickname, "뉴픽");
  assert.ok(request.profileImageFile instanceof MockFile);
  assert.equal(request.profileImageFile.uri, "file:///cache/profile.jpg");
  assert.equal(UpdateProfileRequestSchema.safeParse(request).success, true);
});

test("ImagePicker 결과를 프로젝트 내부 선택 타입으로 변환한다", () => {
  assert.deepEqual(
    toSelectedProfileImage({
      uri: "file:///cache/profile.jpg",
      fileName: null,
      mimeType: "image/jpeg",
    }),
    {
      uri: "file:///cache/profile.jpg",
      fileName: undefined,
      mimeType: "image/jpeg",
    },
  );
});

test("미리보기는 새 선택 이미지를 기존 서버 이미지보다 우선한다", () => {
  assert.equal(
    getProfileImagePreviewUri({
      currentImageUrl: "https://example.com/current.jpg",
      selectedImage: { uri: "file:///cache/new.jpg" },
    }),
    "file:///cache/new.jpg",
  );
  assert.equal(
    getProfileImagePreviewUri({
      currentImageUrl: "https://example.com/current.jpg",
    }),
    "https://example.com/current.jpg",
  );
});

test("프로필 수정 API는 expo/fetch multipart 클라이언트를 사용한다", () => {
  const projectRoot = path.resolve(__dirname, "../../../../../");
  const querySource = fs.readFileSync(
    path.join(
      projectRoot,
      "src/features/profile/save-user-setup/api/update-profile-mutation.ts",
    ),
    "utf8",
  );
  const fieldSource = fs.readFileSync(
    path.join(
      projectRoot,
      "src/features/profile/save-user-setup/ui/profile-image-field.tsx",
    ),
    "utf8",
  );

  assert.match(querySource, /uploadFetchClient\.patch/);
  assert.match(querySource, /ObjectToFormData\(request\)/);
  assert.doesNotMatch(querySource, /privateApiClient\.patch\("\/users\/me"/);
  assert.match(fieldSource, /launchImageLibraryAsync/);
  assert.doesNotMatch(fieldSource, /사진 삭제|사진 제거/);
});
