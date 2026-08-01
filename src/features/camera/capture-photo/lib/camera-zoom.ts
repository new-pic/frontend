export const DEFAULT_CAMERA_DISPLAY_ZOOM = 1;
export const CAMERA_ZOOM_BUTTON_LEVELS = [0.5, 1, 2] as const;
export const CAMERA_ZOOM_EPSILON = 0.01;
const LEGACY_ULTRA_WIDE_DISPLAY_ZOOM_MULTIPLIER = 0.5;

interface CameraZoomDeviceCapabilities {
  isVirtualDevice: boolean;
  physicalDevices: ReadonlyArray<{ type: string }>;
  zoomLensSwitchFactors: readonly number[];
}

interface CameraZoomControllerCapabilities {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  displayableZoomFactor: number;
}

interface CameraZoomRangeInput {
  rawMinZoom: number;
  rawMaxZoom: number;
  displayZoomMultiplier: number;
  preferredDisplayZoom?: number;
}

export interface CameraZoomConfiguration {
  rawMinZoom: number;
  rawMaxZoom: number;
  rawZoom: number;
  displayZoomMultiplier: number;
  displayMinZoom: number;
  displayMaxZoom: number;
  displayZoom: number;
}

export function clampCameraZoom(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(Math.max(value, min), max);
}

function getDeviceDisplayZoomMultiplier(
  device: CameraZoomDeviceCapabilities,
) {
  const firstLensSwitchFactor = device.zoomLensSwitchFactors[0];
  const hasUltraWideCamera = device.physicalDevices.some(
    ({ type }) => type === "ultra-wide-angle",
  );

  if (
    device.isVirtualDevice &&
    hasUltraWideCamera &&
    firstLensSwitchFactor !== undefined &&
    firstLensSwitchFactor > 0
  ) {
    return firstLensSwitchFactor > 1
      ? 1 / firstLensSwitchFactor
      : LEGACY_ULTRA_WIDE_DISPLAY_ZOOM_MULTIPLIER;
  }

  return 1;
}

/**
 * VisionCamera의 raw zoom을 카메라 앱에서 익숙한 0.5x/1x/2x 표기로
 * 바꾸는 배율입니다. Controller 값이 없거나 구형 iOS에서 raw 값을
 * 그대로 반환하면 virtual device의 렌즈 전환 지점을 사용합니다.
 */
export function resolveCameraDisplayZoomMultiplier(
  controller: CameraZoomControllerCapabilities | null,
  device: CameraZoomDeviceCapabilities,
) {
  const controllerMultiplier =
    controller && controller.zoom > 0
      ? controller.displayableZoomFactor / controller.zoom
      : Number.NaN;

  if (
    Number.isFinite(controllerMultiplier) &&
    controllerMultiplier > 0 &&
    Math.abs(controllerMultiplier - 1) > CAMERA_ZOOM_EPSILON
  ) {
    return controllerMultiplier;
  }

  const deviceMultiplier = getDeviceDisplayZoomMultiplier(device);
  if (deviceMultiplier !== 1) return deviceMultiplier;

  return Number.isFinite(controllerMultiplier) &&
    controllerMultiplier > 0
    ? controllerMultiplier
    : 1;
}

export function createCameraZoomConfiguration({
  rawMinZoom,
  rawMaxZoom,
  displayZoomMultiplier,
  preferredDisplayZoom = DEFAULT_CAMERA_DISPLAY_ZOOM,
}: CameraZoomRangeInput): CameraZoomConfiguration {
  const safeMultiplier =
    Number.isFinite(displayZoomMultiplier) &&
    displayZoomMultiplier > 0
      ? displayZoomMultiplier
      : 1;
  const safeMaxZoom = Math.max(rawMinZoom, rawMaxZoom);
  const displayMinZoom = rawMinZoom * safeMultiplier;
  const displayMaxZoom = safeMaxZoom * safeMultiplier;
  const displayZoom = clampCameraZoom(
    preferredDisplayZoom,
    displayMinZoom,
    displayMaxZoom,
  );
  const rawZoom = clampCameraZoom(
    displayZoom / safeMultiplier,
    rawMinZoom,
    safeMaxZoom,
  );

  return {
    rawMinZoom,
    rawMaxZoom: safeMaxZoom,
    rawZoom,
    displayZoomMultiplier: safeMultiplier,
    displayMinZoom,
    displayMaxZoom,
    displayZoom,
  };
}

export function getSupportedCameraZoomLevels(
  minDisplayZoom: number,
  maxDisplayZoom: number,
  levels: readonly number[] = CAMERA_ZOOM_BUTTON_LEVELS,
) {
  const supportedLevels = levels.filter(
    (level) =>
      level >= minDisplayZoom - CAMERA_ZOOM_EPSILON &&
      level <= maxDisplayZoom + CAMERA_ZOOM_EPSILON,
  );

  if (supportedLevels.length > 0) return supportedLevels;

  return [
    clampCameraZoom(
      DEFAULT_CAMERA_DISPLAY_ZOOM,
      minDisplayZoom,
      maxDisplayZoom,
    ),
  ];
}
