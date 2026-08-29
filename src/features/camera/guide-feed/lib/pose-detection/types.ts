import type { VisionCameraPoseFrameSink } from "@newpic/vision-camera-pose";

export type PosePoint = {
  x: number;
  y: number;
  z?: number;
  confidence?: number;
};

export type DetectedPersonPose = {
  landmarks: PosePoint[];
};

export type DetectedPoseFrame = {
  timestamp: number;
  poses: DetectedPersonPose[];
  inputSize: {
    width: number;
    height: number;
  };
  sourceFrame: {
    width: number;
    height: number;
    rotationDegrees: 0 | 90 | 180 | 270;
    isMirrored: boolean;
  };
};

export type PoseDetectionStatus = "idle" | "initializing" | "running" | "error";

export type PoseDetectionError = {
  code: string;
  message: string;
};

export type LivePoseDetection = {
  frame: DetectedPoseFrame | null;
  error: PoseDetectionError | null;
  status: PoseDetectionStatus;
  frameSink: VisionCameraPoseFrameSink;
};
