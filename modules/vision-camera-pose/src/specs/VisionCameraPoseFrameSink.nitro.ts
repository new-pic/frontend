import type { HybridObject } from "react-native-nitro-modules";
import type { Frame } from "react-native-vision-camera";

export interface NativePoseDetectionOptions {
  numPoses: number;
  maxInferenceFps: number;
  maxInputLongEdge: number;
  minPoseDetectionConfidence: number;
  minPosePresenceConfidence: number;
  minTrackingConfidence: number;
}

export interface NativePosePoint {
  x: number;
  y: number;
  z: number;
  confidence: number;
}

export interface NativeDetectedPersonPose {
  landmarks: NativePosePoint[];
}

export interface NativeDetectedPoseFrame {
  sequence: number;
  timestamp: number;
  poses: NativeDetectedPersonPose[];
  inputWidth: number;
  inputHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  rotationDegrees: number;
  isMirrored: boolean;
}

export interface NativePoseDetectionError {
  code: string;
  message: string;
}

/**
 * Worklet-safe synchronous ingress for VisionCamera Frames.
 *
 * The caller owns and disposes the Frame. Accepted frames are synchronously
 * copied to an owned MediaPipe input before `pushFrame()` returns.
 */
export interface VisionCameraPoseFrameSink
  extends HybridObject<{ ios: "swift"; android: "kotlin" }> {
  configure(options: NativePoseDetectionOptions): void;
  startAcceptingFrames(): void;
  stopAcceptingFrames(): void;
  releaseDetector(): void;
  pushFrame(frame: Frame): boolean;
  setResultCallback(
    callback:
      | ((result: NativeDetectedPoseFrame) => void)
      | undefined,
  ): void;
  setErrorCallback(
    callback:
      | ((error: NativePoseDetectionError) => void)
      | undefined,
  ): void;
  acknowledgeResult(sequence: number): void;
}
