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
  createCameraZoomConfiguration,
  getSupportedCameraZoomLevels,
  resolveCameraDisplayZoomMultiplier,
} = require("../lib/camera-zoom.ts");

const rearVirtualDevice = {
  isVirtualDevice: true,
  physicalDevices: [
    { type: "ultra-wide-angle" },
    { type: "wide-angle" },
    { type: "telephoto" },
  ],
  zoomLensSwitchFactors: [1, 3],
};

test("rear virtual camera exposes 0.5x, 1x and 2x before the controller is ready", () => {
  const multiplier = resolveCameraDisplayZoomMultiplier(
    null,
    rearVirtualDevice,
  );
  const configuration = createCameraZoomConfiguration({
    rawMinZoom: 1,
    rawMaxZoom: 15,
    displayZoomMultiplier: multiplier,
  });

  assert.equal(multiplier, 0.5);
  assert.equal(configuration.displayZoom, 1);
  assert.equal(configuration.rawZoom, 2);
  assert.deepEqual(
    getSupportedCameraZoomLevels(
      configuration.displayMinZoom,
      configuration.displayMaxZoom,
    ),
    [0.5, 1, 2],
  );
});

test("controller display factor refines the device fallback", () => {
  const multiplier = resolveCameraDisplayZoomMultiplier(
    {
      zoom: 2,
      minZoom: 1,
      maxZoom: 20,
      displayableZoomFactor: 0.8,
    },
    rearVirtualDevice,
  );

  assert.equal(multiplier, 0.4);
});

test("front camera resets to its supported 1x display zoom", () => {
  const frontDevice = {
    isVirtualDevice: false,
    physicalDevices: [{ type: "wide-angle" }],
    zoomLensSwitchFactors: [],
  };
  const multiplier = resolveCameraDisplayZoomMultiplier(
    null,
    frontDevice,
  );
  const configuration = createCameraZoomConfiguration({
    rawMinZoom: 1,
    rawMaxZoom: 8,
    displayZoomMultiplier: multiplier,
  });

  assert.equal(configuration.rawZoom, 1);
  assert.equal(configuration.displayZoom, 1);
  assert.deepEqual(
    getSupportedCameraZoomLevels(
      configuration.displayMinZoom,
      configuration.displayMaxZoom,
    ),
    [1, 2],
  );
});
