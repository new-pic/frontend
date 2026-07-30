const assert = require("node:assert/strict");
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
