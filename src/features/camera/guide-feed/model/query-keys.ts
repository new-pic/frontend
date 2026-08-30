import { feedQueryKeys } from "@entities/feed";

export const cameraGuideQueryKeys = {
  poses: () => [...feedQueryKeys.all, "camera-guide", "pose"] as const,
  pose: (feedId?: string) => [...cameraGuideQueryKeys.poses(), feedId] as const,
  backgroundRemovals: () =>
    [...feedQueryKeys.all, "camera-guide", "background-removal"] as const,
  backgroundRemoval: (feedId?: string) =>
    [...cameraGuideQueryKeys.backgroundRemovals(), feedId] as const,
} as const;
