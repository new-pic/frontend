import type { CoordinateSize } from "../../model/pose-types";

export type QuarterTurn = 0 | 90 | 180 | 270;
export type ResizeMode = "cover" | "contain";
export type CaptureAspectRatio = "4:3" | "16:9";

/**
 * Matching projection is defined once per configured camera session.
 *
 * `center-cover` records the project's current crop approximation explicitly.
 * A future native crop-rect adapter can replace this model without changing
 * the DWPose/MediaPipe domain adapters.
 */
export interface PoseProjectionContext {
  captureSize: CoordinateSize;
  cropModel: "center-cover";
  /**
   * Whether the configured final PhotoOutput uses the mirrored selfie policy.
   * The per-frame input-to-output delta still comes from Frame metadata,
   * because an iOS input buffer may already be mirrored.
   */
  captureMirrorX: boolean;
}

export interface SourcePoseToCaptureTransform {
  sourceSize: CoordinateSize;
  captureSize: CoordinateSize;
  /**
   * The server DWPose coordinates already use the upright source image.
   * This flag is only for an explicitly mirrored final reference canvas.
   */
  mirrorX: boolean;
  captureResizeMode: ResizeMode;
}

export interface MediaPipePoseToCaptureTransform {
  /**
   * The native Pose input is already physically rotated upright before
   * MediaPipe runs. Do not apply sourceFrame.rotationDegrees again.
   */
  inputSize: CoordinateSize;
  captureSize: CoordinateSize;
  /**
   * Whether the final saved capture differs horizontally from the
   * unmirrored MediaPipe input. Preview-only mirroring is separate.
   */
  mirrorX: boolean;
  captureResizeMode: ResizeMode;
}

export interface CaptureToPreviewTransform {
  captureSize: CoordinateSize;
  previewSize: CoordinateSize;
  previewResizeMode: ResizeMode;
  /**
   * Set only when preview presentation differs from the saved capture.
   */
  mirrorX: boolean;
}

export interface PreviewPoint {
  x: number;
  y: number;
}

export interface CanvasRenderRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
