import {
  setVisionCameraPoseErrorCallback,
  setVisionCameraPoseResultCallback,
  visionCameraPoseFrameSink,
} from "@newpic/vision-camera-pose";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { adaptNativeDetectedPoseFrame } from "./native-pose-result-adapter";
import {
  type PoseDetectionConfig,
  resolvePoseDetectionConfig,
} from "./pose-detection-config";
import type {
  DetectedPoseFrame,
  LivePoseDetection,
  PoseDetectionError,
  PoseDetectionStatus,
} from "./types";

export type UseLivePoseDetectionOptions =
  PoseDetectionConfig & {
    /**
     * Set this only while the VisionCamera session is active and a target
     * overlay is available and visible.
     */
    enabled: boolean;
    debug?: boolean;
    /**
     * Receives latest-only native results without requiring React state to
     * update at inference FPS.
     */
    onFrame?: (frame: DetectedPoseFrame) => void;
    exposeFrame?: boolean;
  };

export function useLivePoseDetection({
  enabled,
  debug = false,
  onFrame,
  exposeFrame = true,
  ...config
}: UseLivePoseDetectionOptions): LivePoseDetection {
  const [appState, setAppState] = useState(
    AppState.currentState,
  );
  const [frame, setFrame] =
    useState<DetectedPoseFrame | null>(null);
  const [error, setError] =
    useState<PoseDetectionError | null>(null);
  const [status, setStatus] =
    useState<PoseDetectionStatus>("idle");
  const shouldAcceptResultsRef = useRef(false);
  const debugRef = useRef(debug);
  const onFrameRef = useRef(onFrame);
  const exposeFrameRef = useRef(exposeFrame);
  debugRef.current = debug;
  onFrameRef.current = onFrame;
  exposeFrameRef.current = exposeFrame;
  const resolvedConfig = useMemo(
    () => resolvePoseDetectionConfig(config),
    [
      config.maxInferenceFps,
      config.maxInputLongEdge,
      config.minPoseDetectionConfidence,
      config.minPosePresenceConfidence,
      config.minTrackingConfidence,
      config.targetPersonCount,
    ],
  );
  const isForeground = appState === "active";
  const shouldRun = enabled && isForeground;

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      setAppState,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setVisionCameraPoseResultCallback((nativeFrame) => {
      if (!shouldAcceptResultsRef.current) return;

      const detectedFrame =
        adaptNativeDetectedPoseFrame(nativeFrame);
      onFrameRef.current?.(detectedFrame);
      if (exposeFrameRef.current) {
        setFrame(detectedFrame);
      }
      setError(null);
      setStatus("running");

      if (__DEV__ && debugRef.current) {
        console.debug("[PoseDetection]", {
          timestamp: detectedFrame.timestamp,
          poseCount: detectedFrame.poses.length,
          landmarkCounts: detectedFrame.poses.map(
            (pose) => pose.landmarks.length,
          ),
          inputSize: detectedFrame.inputSize,
        });
      }
    });
    setVisionCameraPoseErrorCallback((nativeError) => {
      if (!shouldAcceptResultsRef.current) return;

      setError(nativeError);
      setStatus("error");
      if (__DEV__ && debugRef.current) {
        console.warn("[PoseDetection]", nativeError);
      }
    });

    return () => {
      shouldAcceptResultsRef.current = false;
      setVisionCameraPoseResultCallback(undefined);
      setVisionCameraPoseErrorCallback(undefined);
      visionCameraPoseFrameSink.stopAcceptingFrames();
      visionCameraPoseFrameSink.releaseDetector();
    };
  }, []);

  useEffect(() => {
    visionCameraPoseFrameSink.configure(resolvedConfig);

    if (shouldRun) {
      shouldAcceptResultsRef.current = true;
      setStatus("initializing");
      setError(null);
      visionCameraPoseFrameSink.startAcceptingFrames();
      return;
    }

    shouldAcceptResultsRef.current = false;
    visionCameraPoseFrameSink.stopAcceptingFrames();
    setFrame(null);
    setError(null);
    setStatus("idle");
  }, [resolvedConfig, shouldRun]);

  return {
    frame,
    error,
    status,
    frameSink: visionCameraPoseFrameSink,
  };
}
