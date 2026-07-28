import type {
  CaptureAspectRatio,
  CaptureToPreviewTransform,
  CommonPose,
  CommonPosePoint,
  CoordinateSize,
  PreviewPoint,
  RawToCaptureTransform,
  ResizeMode,
} from "../model";

function assertPositiveSize(size: CoordinateSize, label: string) {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new Error(`${label} width and height must be positive`);
  }
}

export function createCaptureCanvasSize(
  aspectRatio: CaptureAspectRatio,
  width: number,
): CoordinateSize {
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error("Capture canvas width must be positive");
  }

  const ratio = aspectRatio === "4:3" ? 4 / 3 : 16 / 9;
  return { width, height: width / ratio };
}

function getOrientedSize(
  sourceSize: CoordinateSize,
  rotationDegrees: RawToCaptureTransform["rotationDegrees"],
): CoordinateSize {
  return rotationDegrees === 90 || rotationDegrees === 270
    ? { width: sourceSize.height, height: sourceSize.width }
    : sourceSize;
}

function rotateNormalizedPoint(
  point: CommonPosePoint,
  rotationDegrees: RawToCaptureTransform["rotationDegrees"],
): CommonPosePoint {
  switch (rotationDegrees) {
    case 0:
      return point;
    case 90:
      return { ...point, x: 1 - point.y, y: point.x };
    case 180:
      return { ...point, x: 1 - point.x, y: 1 - point.y };
    case 270:
      return { ...point, x: point.y, y: 1 - point.x };
  }
}

function mapNormalizedPointBetweenCanvases(
  point: CommonPosePoint,
  sourceSize: CoordinateSize,
  destinationSize: CoordinateSize,
  resizeMode: ResizeMode,
): CommonPosePoint {
  const scale =
    resizeMode === "cover"
      ? Math.max(
          destinationSize.width / sourceSize.width,
          destinationSize.height / sourceSize.height,
        )
      : Math.min(
          destinationSize.width / sourceSize.width,
          destinationSize.height / sourceSize.height,
        );
  const renderedWidth = sourceSize.width * scale;
  const renderedHeight = sourceSize.height * scale;
  const offsetX = (destinationSize.width - renderedWidth) / 2;
  const offsetY = (destinationSize.height - renderedHeight) / 2;

  return {
    ...point,
    x:
      (point.x * sourceSize.width * scale + offsetX) /
      destinationSize.width,
    y:
      (point.y * sourceSize.height * scale + offsetY) /
      destinationSize.height,
  };
}

/**
 * RawModelCoordinate -> CaptureNormalizedCoordinate.
 *
 * Cover-cropped points are not clamped. A point outside the actual capture
 * region therefore remains outside 0...1 and can be excluded by consumers.
 */
export function rawPointToCaptureNormalized(
  point: CommonPosePoint,
  transform: RawToCaptureTransform,
): CommonPosePoint {
  assertPositiveSize(transform.sourceSize, "Source");
  assertPositiveSize(transform.captureSize, "Capture");

  const normalizedPoint =
    transform.coordinateUnit === "pixel"
      ? {
          ...point,
          x: point.x / transform.sourceSize.width,
          y: point.y / transform.sourceSize.height,
        }
      : point;
  const rotatedPoint = rotateNormalizedPoint(
    normalizedPoint,
    transform.rotationDegrees,
  );
  const orientedPoint = transform.mirrorX
    ? { ...rotatedPoint, x: 1 - rotatedPoint.x }
    : rotatedPoint;

  return mapNormalizedPointBetweenCanvases(
    orientedPoint,
    getOrientedSize(transform.sourceSize, transform.rotationDegrees),
    transform.captureSize,
    transform.captureResizeMode,
  );
}

export function rawPoseToCaptureNormalized(
  pose: CommonPose,
  transform: RawToCaptureTransform,
): CommonPose {
  return {
    joints: Object.fromEntries(
      Object.entries(pose.joints).map(([joint, point]) => [
        joint,
        point
          ? rawPointToCaptureNormalized(point, transform)
          : undefined,
      ]),
    ),
  };
}

/**
 * CaptureNormalizedCoordinate -> PreviewCoordinate (logical pixels).
 *
 * Preview mirroring is presentation-only and never feeds pose comparison.
 */
export function capturePointToPreview(
  point: CommonPosePoint,
  transform: CaptureToPreviewTransform,
): PreviewPoint {
  assertPositiveSize(transform.captureSize, "Capture");
  assertPositiveSize(transform.previewSize, "Preview");

  const previewNormalized = mapNormalizedPointBetweenCanvases(
    point,
    transform.captureSize,
    transform.previewSize,
    transform.previewResizeMode,
  );
  const x = transform.mirrorX
    ? 1 - previewNormalized.x
    : previewNormalized.x;

  return {
    x: x * transform.previewSize.width,
    y: previewNormalized.y * transform.previewSize.height,
  };
}

export function capturePoseToPreview(
  pose: CommonPose,
  transform: CaptureToPreviewTransform,
): Partial<Record<keyof CommonPose["joints"], PreviewPoint>> {
  return Object.fromEntries(
    Object.entries(pose.joints).map(([joint, point]) => [
      joint,
      point ? capturePointToPreview(point, transform) : undefined,
    ]),
  );
}
