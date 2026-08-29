import type { CommonJoint, MediaPipeInputPose } from "./types";

export interface MediaPipePoseLandmark {
  x: number;
  y: number;
  z?: number;
  confidence?: number;
}

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

export function adaptMediaPipePose(
  landmarks: readonly MediaPipePoseLandmark[],
): MediaPipeInputPose {
  return {
    coordinateSpace: "mediapipe_input_normalized",
    joints: Object.fromEntries(
      Object.entries(MEDIAPIPE_POSE_INDEX).flatMap(([joint, index]) => {
        const landmark = landmarks[index];
        return landmark
          ? [
              [
                joint,
                {
                  x: landmark.x,
                  y: landmark.y,
                  confidence: landmark.confidence ?? 0,
                },
              ],
            ]
          : [];
      }),
    ),
  };
}

export function adaptMediaPipePoses(
  people: readonly {
    landmarks: readonly MediaPipePoseLandmark[];
  }[],
): MediaPipeInputPose[] {
  return people.map(({ landmarks }) => adaptMediaPipePose(landmarks));
}
