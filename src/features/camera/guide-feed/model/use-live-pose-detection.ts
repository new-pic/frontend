import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { nativePoseDetectionRuntime } from "../lib/pose-detection/native-pose-detection-runtime";
import { resolvePoseDetectionConfig } from "../lib/pose-detection/pose-detection-config";
import type {
  LivePoseDetection,
  PoseDetectionError,
  PoseDetectionStatus,
  UseLivePoseDetectionOptions,
} from "./pose-detection-types";
import type { DetectedPoseFrame } from "./pose-types";

export function useLivePoseDetection({
  enabled,
  debug = false,
  onFrame,
  exposeFrame = true,
  ...config
}: UseLivePoseDetectionOptions): LivePoseDetection<
  typeof nativePoseDetectionRuntime.frameSink
> {
  const [appState, setAppState] = useState(AppState.currentState);
  const [frame, setFrame] = useState<DetectedPoseFrame | null>(null);
  const [error, setError] = useState<PoseDetectionError | null>(null);
  const [status, setStatus] = useState<PoseDetectionStatus>("idle");
  const shouldAcceptResultsRef = useRef(false);
  const debugRef = useRef(debug);
  const onFrameRef = useRef(onFrame);
  const exposeFrameRef = useRef(exposeFrame);
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
    debugRef.current = debug;
    onFrameRef.current = onFrame;
    exposeFrameRef.current = exposeFrame;
  }, [debug, exposeFrame, onFrame]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const releaseOwnership = nativePoseDetectionRuntime.acquire({
      shouldAcceptResult: () => shouldAcceptResultsRef.current,
      onFrame: (detectedFrame) => {
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
      },
      onError: (nativeError) => {
        setError(nativeError);
        setStatus("error");
        if (__DEV__ && debugRef.current) {
          console.warn("[PoseDetection]", nativeError);
        }
      },
    });

    return () => {
      shouldAcceptResultsRef.current = false;
      releaseOwnership();
      nativePoseDetectionRuntime.stop();
      nativePoseDetectionRuntime.release();
    };
  }, []);

  useEffect(() => {
    nativePoseDetectionRuntime.configure(resolvedConfig);

    if (shouldRun) {
      shouldAcceptResultsRef.current = true;
      setStatus("initializing");
      setError(null);
      nativePoseDetectionRuntime.start();
      return;
    }

    shouldAcceptResultsRef.current = false;
    nativePoseDetectionRuntime.stop();
    setFrame(null);
    setError(null);
    setStatus("idle");
  }, [resolvedConfig, shouldRun]);

  return {
    frame,
    error,
    status,
    frameSink: nativePoseDetectionRuntime.frameSink,
  };
}
