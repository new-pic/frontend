import {
  setVisionCameraPoseErrorCallback,
  setVisionCameraPoseResultCallback,
  visionCameraPoseFrameSink,
} from "@newpic/vision-camera-pose";
import type { PoseDetectionRuntime } from "../../model/pose-detection-types";
import { adaptNativeDetectedPoseFrame } from "./native-pose-result-adapter";

export const nativePoseDetectionRuntime = {
  frameSink: visionCameraPoseFrameSink,

  subscribe({ shouldAcceptResult, onFrame, onError }) {
    setVisionCameraPoseResultCallback((nativeFrame) => {
      if (!shouldAcceptResult()) return;
      onFrame(adaptNativeDetectedPoseFrame(nativeFrame));
    });
    setVisionCameraPoseErrorCallback((error) => {
      if (!shouldAcceptResult()) return;
      onError(error);
    });

    return () => {
      setVisionCameraPoseResultCallback(undefined);
      setVisionCameraPoseErrorCallback(undefined);
    };
  },

  configure(config) {
    visionCameraPoseFrameSink.configure(config);
  },

  start() {
    visionCameraPoseFrameSink.startAcceptingFrames();
  },

  stop() {
    visionCameraPoseFrameSink.stopAcceptingFrames();
  },

  release() {
    visionCameraPoseFrameSink.releaseDetector();
  },
} satisfies PoseDetectionRuntime<typeof visionCameraPoseFrameSink>;
