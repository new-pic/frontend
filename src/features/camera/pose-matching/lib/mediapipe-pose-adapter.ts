import type {
  CommonJoint,
  CommonPose,
  RawToCaptureTransform,
} from "../model";
import { rawPoseToCaptureNormalized } from "./coordinate-transform";

export interface MediaPipeLandmark {
  x: number;
  y: number;
  visibility?: number;
  presence?: number;
}

export interface MediaPipePoseAdapterOptions {
  coordinateTransform: RawToCaptureTransform;
}

/**
 * MediaPipe PoseLandmark's official 33-landmark enum.
 */
const MEDIAPIPE_POSE_INDEX: Record<CommonJoint, number> = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

function getMediaPipeConfidence(landmark: MediaPipeLandmark) {
  const confidenceValues = [
    landmark.visibility,
    landmark.presence,
  ].filter((value): value is number => value !== undefined);

  return confidenceValues.length > 0
    ? Math.min(...confidenceValues)
    : 1;
}

export function adaptMediaPipePose(
  landmarks: readonly MediaPipeLandmark[],
  options: MediaPipePoseAdapterOptions,
): CommonPose {
  const rawPose: CommonPose = {
    joints: Object.fromEntries(
      Object.entries(MEDIAPIPE_POSE_INDEX).flatMap(
        ([joint, index]) => {
          const landmark = landmarks[index];
          return landmark
            ? [
                [
                  joint,
                  {
                    x: landmark.x,
                    y: landmark.y,
                    confidence: getMediaPipeConfidence(landmark),
                  },
                ],
              ]
            : [];
        },
      ),
    ),
  };

  return rawPoseToCaptureNormalized(
    rawPose,
    options.coordinateTransform,
  );
}

export function adaptMediaPipePoses(
  people: readonly (readonly MediaPipeLandmark[])[],
  options: MediaPipePoseAdapterOptions,
): CommonPose[] {
  return people.map((landmarks) =>
    adaptMediaPipePose(landmarks, options),
  );
}
