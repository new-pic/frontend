import type { Href } from "expo-router";

export const CAMERA_GUIDE_NAVIGATION = {
  params: {
    feedId: "guideFeedId",
  },
} as const;

export type CameraGuideNavigationSearchParams = Partial<
  Record<
    (typeof CAMERA_GUIDE_NAVIGATION.params)[keyof typeof CAMERA_GUIDE_NAVIGATION.params],
    string | string[]
  >
>;

function normalizeGuideFeedId(feedId: string) {
  const normalizedFeedId = feedId.trim();
  if (!normalizedFeedId) {
    throw new Error("가이드 피드 ID가 필요합니다.");
  }
  return normalizedFeedId;
}

export function createCameraGuideHref(feedId: string): Href {
  const normalizedFeedId = normalizeGuideFeedId(feedId);

  return {
    pathname: "/camera",
    params: {
      [CAMERA_GUIDE_NAVIGATION.params.feedId]:
        normalizedFeedId,
    },
  };
}

export function createCameraGuidePath(feedId: string) {
  const normalizedFeedId = normalizeGuideFeedId(feedId);
  return `/camera?${CAMERA_GUIDE_NAVIGATION.params.feedId}=${encodeURIComponent(
    normalizedFeedId,
  )}`;
}
