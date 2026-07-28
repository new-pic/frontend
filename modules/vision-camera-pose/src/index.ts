import { NitroModules } from "react-native-nitro-modules";
import type {
  NativeDetectedPoseFrame,
  NativePoseDetectionError,
  NativePoseDetectionOptions,
  VisionCameraPoseFrameSink,
} from "./specs/VisionCameraPoseFrameSink.nitro";

export const visionCameraPoseFrameSink =
  NitroModules.createHybridObject<VisionCameraPoseFrameSink>(
    "VisionCameraPoseFrameSink",
  );

export function setVisionCameraPoseResultCallback(
  callback:
    | ((result: NativeDetectedPoseFrame) => void)
    | undefined,
) {
  if (callback == null) {
    visionCameraPoseFrameSink.setResultCallback(undefined);
    return;
  }

  visionCameraPoseFrameSink.setResultCallback((result) => {
    try {
      callback(result);
    } finally {
      visionCameraPoseFrameSink.acknowledgeResult(
        result.sequence,
      );
    }
  });
}

export function setVisionCameraPoseErrorCallback(
  callback:
    | ((error: NativePoseDetectionError) => void)
    | undefined,
) {
  visionCameraPoseFrameSink.setErrorCallback(callback);
}

export type {
  NativeDetectedPersonPose,
  NativeDetectedPoseFrame,
  NativePoseDetectionError,
  NativePoseDetectionOptions,
  NativePosePoint,
  VisionCameraPoseFrameSink,
} from "./specs/VisionCameraPoseFrameSink.nitro";
