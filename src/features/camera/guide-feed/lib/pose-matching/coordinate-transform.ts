import type {
  CaptureAspectRatio,
  CaptureToPreviewTransform,
  CanvasRenderRect,
  CommonPose,
  CommonPosePoint,
  CoordinateSize,
  DWPoseSourcePose,
  MediaPipeInputPose,
  MediaPipePoseToCaptureTransform,
  PoseJointMap,
  PreviewPoint,
  QuarterTurn,
  ResizeMode,
  SourcePoseToCaptureTransform,
} from "./types";

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

/**
 * CameraOutput.currentResolution is sensor-native and unrotated. Use the
 * output orientation delta to obtain the final capture canvas dimensions.
 */
export function orientCoordinateSize(
  size: CoordinateSize,
  rotationDegrees: QuarterTurn,
): CoordinateSize {
  assertPositiveSize(size, "Coordinate");
  return rotationDegrees === 90 || rotationDegrees === 270
    ? { width: size.height, height: size.width }
    : size;
}

export function createCaptureCanvasSize(
  aspectRatio: CaptureAspectRatio,
  longEdge: number,
  orientation: "landscape" | "portrait" = "landscape",
): CoordinateSize {
  if (!Number.isFinite(longEdge) || longEdge <= 0) {
    throw new Error("Capture canvas long edge must be positive");
  }

  const ratio = aspectRatio === "4:3" ? 4 / 3 : 16 / 9;
  return orientation === "landscape"
    ? { width: longEdge, height: longEdge / ratio }
    : { width: longEdge / ratio, height: longEdge };
}

function mapNormalizedPointBetweenCanvases(
  point: CommonPosePoint,
  sourceSize: CoordinateSize,
  destinationSize: CoordinateSize,
  resizeMode: ResizeMode,
): CommonPosePoint {
  const renderedRect = calculateCanvasRenderRect(
    sourceSize,
    destinationSize,
    resizeMode,
  );

  return {
    ...point,
    x:
      (point.x * renderedRect.width + renderedRect.x) /
      destinationSize.width,
    y:
      (point.y * renderedRect.height + renderedRect.y) /
      destinationSize.height,
  };
}

export function calculateCanvasRenderRect(
  sourceSize: CoordinateSize,
  destinationSize: CoordinateSize,
  resizeMode: ResizeMode,
): CanvasRenderRect {
  assertPositiveSize(sourceSize, "Source");
  assertPositiveSize(destinationSize, "Destination");

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
    x: offsetX,
    y: offsetY,
    width: renderedWidth,
    height: renderedHeight,
  };
}

/**
 * Composes Source -> Capture and Capture -> Preview rendering without
 * bypassing the capture-normalized coordinate contract.
 */
export function projectSourceCanvasToPreviewRect(
  sourceSize: CoordinateSize,
  transform: CaptureToPreviewTransform,
  sourceResizeMode: ResizeMode = "cover",
): CanvasRenderRect {
  const sourceInCapture = calculateCanvasRenderRect(
    sourceSize,
    transform.captureSize,
    sourceResizeMode,
  );
  const captureInPreview = calculateCanvasRenderRect(
    transform.captureSize,
    transform.previewSize,
    transform.previewResizeMode,
  );
  const captureScaleX =
    captureInPreview.width / transform.captureSize.width;
  const captureScaleY =
    captureInPreview.height / transform.captureSize.height;
  const width = sourceInCapture.width * captureScaleX;
  const height = sourceInCapture.height * captureScaleY;
  const unmirroredX =
    captureInPreview.x + sourceInCapture.x * captureScaleX;

  return {
    x: transform.mirrorX
      ? transform.previewSize.width - unmirroredX - width
      : unmirroredX,
    y: captureInPreview.y + sourceInCapture.y * captureScaleY,
    width,
    height,
  };
}

function projectNormalizedPointToCapture(
  point: CommonPosePoint,
  sourceSize: CoordinateSize,
  captureSize: CoordinateSize,
  mirrorX: boolean,
  resizeMode: ResizeMode,
): CommonPosePoint {
  assertPositiveSize(sourceSize, "Source");
  assertPositiveSize(captureSize, "Capture");

  const orientedPoint = mirrorX
    ? { ...point, x: 1 - point.x }
    : point;

  return mapNormalizedPointBetweenCanvases(
    orientedPoint,
    sourceSize,
    captureSize,
    resizeMode,
  );
}

function projectPoseToCapture(
  pose: PoseJointMap,
  sourceSize: CoordinateSize,
  captureSize: CoordinateSize,
  mirrorX: boolean,
  resizeMode: ResizeMode,
): CommonPose {
  return {
    joints: Object.fromEntries(
      Object.entries(pose.joints).map(([joint, point]) => [
        joint,
        point
          ? projectNormalizedPointToCapture(
              point,
              sourceSize,
              captureSize,
              mirrorX,
              resizeMode,
            )
          : undefined,
      ]),
    ),
  };
}

/**
 * DWPose source-image normalized coordinate -> Capture normalized coordinate.
 *
 * Cover-cropped points are intentionally not clamped. Consumers can exclude
 * joints outside 0...1 without losing the crop geometry.
 */
export function projectDWPosePoseToCapture(
  pose: DWPoseSourcePose,
  transform: SourcePoseToCaptureTransform,
): CommonPose {
  return projectPoseToCapture(
    pose,
    transform.sourceSize,
    transform.captureSize,
    transform.mirrorX,
    transform.captureResizeMode,
  );
}

/**
 * MediaPipe input normalized coordinate -> Capture normalized coordinate.
 *
 * The native input adapter has already physically rotated the frame upright.
 * `sourceFrame.rotationDegrees` must not be applied at this stage.
 */
export function projectMediaPipePoseToCapture(
  pose: MediaPipeInputPose,
  transform: MediaPipePoseToCaptureTransform,
): CommonPose {
  return projectPoseToCapture(
    pose,
    transform.inputSize,
    transform.captureSize,
    transform.mirrorX,
    transform.captureResizeMode,
  );
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
