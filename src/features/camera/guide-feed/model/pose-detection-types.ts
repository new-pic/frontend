import type { DetectedPoseFrame } from "./pose-types";

export interface PoseDetectionConfig {
  targetPersonCount?: number;
  maxInferenceFps?: number;
  maxInputLongEdge?: number;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
}

export interface ResolvedPoseDetectionConfig {
  numPoses: number;
  maxInferenceFps: number;
  maxInputLongEdge: number;
  minPoseDetectionConfidence: number;
  minPosePresenceConfidence: number;
  minTrackingConfidence: number;
}

export type PoseDetectionStatus = "idle" | "initializing" | "running" | "error";

export interface PoseDetectionError {
  code: string;
  message: string;
}

export interface PoseDetectionRuntimeListener {
  shouldAcceptResult: () => boolean;
  onFrame: (frame: DetectedPoseFrame) => void;
  onError: (error: PoseDetectionError) => void;
}

export interface PoseDetectionRuntime<TFrameSink> {
  frameSink: TFrameSink;
  acquire: (listener: PoseDetectionRuntimeListener) => () => void;
  configure: (config: ResolvedPoseDetectionConfig) => void;
  start: () => void;
  stop: () => void;
  release: () => void;
}

export interface LivePoseDetection<TFrameSink> {
  frame: DetectedPoseFrame | null;
  error: PoseDetectionError | null;
  status: PoseDetectionStatus;
  frameSink: TFrameSink;
}

export interface UseLivePoseDetectionOptions extends PoseDetectionConfig {
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
}
