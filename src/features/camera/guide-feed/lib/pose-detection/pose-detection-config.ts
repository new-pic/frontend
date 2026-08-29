export const MAX_POSE_COUNT = 4;
export const MAX_POSE_INFERENCE_FPS = 10;

/**
 * Initial calibration values. Device tests should tune these values against
 * detection recall, latency, thermal load, and battery usage.
 */
export const DEFAULT_POSE_DETECTION_CONFIG = {
  defaultPoseCount: MAX_POSE_COUNT,
  maxInferenceFps: MAX_POSE_INFERENCE_FPS,
  maxInputLongEdge: 640,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
} as const;

export type PoseDetectionConfig = {
  targetPersonCount?: number;
  maxInferenceFps?: number;
  maxInputLongEdge?: number;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
};

export function resolvePoseCount(targetPersonCount?: number) {
  const requested =
    targetPersonCount ?? DEFAULT_POSE_DETECTION_CONFIG.defaultPoseCount;
  return Math.min(MAX_POSE_COUNT, Math.max(1, Math.trunc(requested)));
}

export function resolvePoseDetectionConfig(config: PoseDetectionConfig = {}) {
  return {
    numPoses: resolvePoseCount(config.targetPersonCount),
    maxInferenceFps: Math.min(
      MAX_POSE_INFERENCE_FPS,
      Math.max(
        1,
        config.maxInferenceFps ?? DEFAULT_POSE_DETECTION_CONFIG.maxInferenceFps,
      ),
    ),
    maxInputLongEdge:
      config.maxInputLongEdge ?? DEFAULT_POSE_DETECTION_CONFIG.maxInputLongEdge,
    minPoseDetectionConfidence:
      config.minPoseDetectionConfidence ??
      DEFAULT_POSE_DETECTION_CONFIG.minPoseDetectionConfidence,
    minPosePresenceConfidence:
      config.minPosePresenceConfidence ??
      DEFAULT_POSE_DETECTION_CONFIG.minPosePresenceConfidence,
    minTrackingConfidence:
      config.minTrackingConfidence ??
      DEFAULT_POSE_DETECTION_CONFIG.minTrackingConfidence,
  };
}
