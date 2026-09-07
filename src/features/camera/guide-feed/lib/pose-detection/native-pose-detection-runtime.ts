import {
  setVisionCameraPoseErrorCallback,
  setVisionCameraPoseResultCallback,
  visionCameraPoseFrameSink,
} from "@newpic/vision-camera-pose";
import type { PoseDetectionRuntime } from "../../model/pose-detection-types";
import { adaptNativeDetectedPoseFrame } from "./native-pose-result-adapter";

let activeOwner: symbol | null = null;

export const nativePoseDetectionRuntime = {
  frameSink: visionCameraPoseFrameSink,

  acquire({ shouldAcceptResult, onFrame, onError }) {
    if (activeOwner) {
      throw new Error("Native pose detection runtime already has an owner.");
    }

    const owner = Symbol("native-pose-detection-owner");
    activeOwner = owner;
    setVisionCameraPoseResultCallback((nativeFrame) => {
      if (!shouldAcceptResult()) return;
      onFrame(adaptNativeDetectedPoseFrame(nativeFrame));
    });
    setVisionCameraPoseErrorCallback((error) => {
      if (!shouldAcceptResult()) return;
      onError(error);
    });

    return () => {
      if (activeOwner !== owner) return;

      activeOwner = null;
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
