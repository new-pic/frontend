import type { CoordinateSize } from "../../model/pose-types";

export type QuarterTurn = 0 | 90 | 180 | 270;
export type ResizeMode = "cover" | "contain";
export type CaptureAspectRatio = "4:3" | "16:9";

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
