import type { HybridObject } from "react-native-nitro-modules";
import type { Frame } from "react-native-vision-camera";

/**
 * Synchronous camera-thread sink used by VisionCamera's FrameOutput.
 *
 * Frame ownership remains with the caller. `pushFrame()` never stores the
 * VisionCamera Frame and the worklet must dispose it exactly once.
 */
export interface VisionCameraRtcFrameSink extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  startAcceptingFrames(): void;
  stopAcceptingFrames(): void;
  pushFrame(frame: Frame): boolean;
}
