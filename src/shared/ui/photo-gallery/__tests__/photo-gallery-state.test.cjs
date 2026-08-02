const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  clampPhotoGalleryIndex,
} = require("../photo-gallery-state.ts");

test("사진 갤러리 시작 index를 이미지 범위로 제한한다", () => {
  assert.equal(clampPhotoGalleryIndex(-2, 4), 0);
  assert.equal(clampPhotoGalleryIndex(2, 4), 2);
  assert.equal(clampPhotoGalleryIndex(9, 4), 3);
  assert.equal(clampPhotoGalleryIndex(1, 0), 0);
});

test("공용 갤러리는 현재 사진 기반 확장 slot을 제공한다", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../photo-gallery-modal.tsx"),
    "utf8",
  );

  assert.match(source, /renderHeaderRight/);
  assert.match(source, /renderImageOverlay/);
  assert.match(source, /renderFooterDetails/);
  assert.match(source, /activeImage/);
});
