import type { FeedBackgroundRemovalResponse } from "@entities/feed";
import type { CameraGuideContour, CameraGuideOutline } from "../model/types";

function isFiniteNormalizedCoordinate(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function adaptContour(
  contour: FeedBackgroundRemovalResponse["output"]["result"]["contours"][number],
): CameraGuideContour {
  if (
    !Number.isInteger(contour.contourIndex) ||
    typeof contour.closed !== "boolean" ||
    !Number.isFinite(contour.areaRatio) ||
    contour.areaRatio < 0 ||
    contour.areaRatio > 1 ||
    !Array.isArray(contour.points) ||
    contour.points.length < 2
  ) {
    throw new Error("촬영 가이드 윤곽선 형식이 올바르지 않습니다.");
  }

  const points = contour.points.map(({ x, y }) => {
    if (!isFiniteNormalizedCoordinate(x) || !isFiniteNormalizedCoordinate(y)) {
      throw new Error(
        "촬영 가이드 윤곽선 좌표가 normalized 범위를 벗어났습니다.",
      );
    }
    return { x, y };
  });

  return {
    contourIndex: contour.contourIndex,
    closed: contour.closed,
    areaRatio: contour.areaRatio,
    points,
  };
}

export function adaptFeedBackgroundRemoval(
  response: FeedBackgroundRemovalResponse,
): CameraGuideOutline {
  const result = response.output?.result;
  if (response.output?.success !== true || !result) {
    throw new Error("촬영 가이드 윤곽선 데이터를 사용할 수 없습니다.");
  }

  const { imageWidth, imageHeight } = result;
  if (
    typeof imageWidth !== "number" ||
    typeof imageHeight !== "number" ||
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    throw new Error("촬영 가이드 원본 크기가 올바르지 않습니다.");
  }

  if (!Array.isArray(result.contours) || result.contours.length === 0) {
    throw new Error("촬영 가이드 윤곽선이 없습니다.");
  }

  return {
    sourceSize: {
      width: imageWidth,
      height: imageHeight,
    },
    contours: result.contours.map(adaptContour),
  };
}
