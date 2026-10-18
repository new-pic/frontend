const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "../../../../../");
const sourceRoot = path.join(projectRoot, "src");

const paperlogyFamilies = [
  ["thin", "Paperlogy-1Thin"],
  ["extralight", "Paperlogy-2ExtraLight"],
  ["light", "Paperlogy-3Light"],
  ["regular", "Paperlogy-4Regular"],
  ["medium", "Paperlogy-5Medium"],
  ["semibold", "Paperlogy-6SemiBold"],
  ["bold", "Paperlogy-7Bold"],
  ["extrabold", "Paperlogy-8ExtraBold"],
  ["black", "Paperlogy-9Black"],
];

function readSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) return readSourceFiles(entryPath);
    if (!/\.(?:css|js|jsx|ts|tsx)$/.test(entry.name)) return [];

    return [[entryPath, fs.readFileSync(entryPath, "utf8")]];
  });
}

test("Paperlogy 9가지 굵기는 충돌하지 않는 font-family 유틸리티로 매핑된다", () => {
  const globalCss = fs.readFileSync(
    path.join(projectRoot, "src/app/global.css"),
    "utf8",
  );

  for (const [weight, family] of paperlogyFamilies) {
    assert.match(
      globalCss,
      new RegExp(`--font-paperlogy-${weight}:\\s*${family};`),
    );
  }
});

test("Tailwind font-weight와 겹치는 기존 폰트 유틸리티를 재도입하지 않는다", () => {
  const legacyFontUtility =
    /\bfont-(?:thin|extralight|light|normal|regular|medium|semibold|bold|extrabold|black|body|heading)\b/;
  const violations = readSourceFiles(sourceRoot)
    .filter(([, source]) => legacyFontUtility.test(source))
    .map(([filePath]) => path.relative(projectRoot, filePath));

  assert.deepEqual(violations, []);
});

test("공용 텍스트 컴포넌트는 Paperlogy Regular와 Bold family를 명시한다", () => {
  const textStyles = fs.readFileSync(
    path.join(projectRoot, "src/shared/ui/text/styles.tsx"),
    "utf8",
  );

  assert.match(textStyles, /base: `text-foreground font-paperlogy-regular/);
  assert.match(textStyles, /bold:\s*\{\s*true: "font-paperlogy-bold"/);
});
