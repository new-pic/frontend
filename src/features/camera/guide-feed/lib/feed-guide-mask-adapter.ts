import type { FeedBackgroundRemovalResponse } from "@entities/feed";
import type { CameraGuideMask } from "../model/types";

export interface RawCameraGuideMask {
  imageUrl: string;
  sourceSize: CameraGuideMask["sourceSize"] | null;
}

export function adaptFeedBackgroundRemoval(
  response: FeedBackgroundRemovalResponse,
): RawCameraGuideMask {
  const result = response.output.result;
  const imageWidth = result.imageWidth;
  const imageHeight = result.imageHeight;
  if (
    response.output.success !== true ||
    typeof result.backgroundRemovedImage !== "string" ||
    result.backgroundRemovedImage.length === 0
  ) {
    throw new Error("배경 제거 이미지를 사용할 수 없습니다.");
  }

  const hasSize =
    typeof imageWidth === "number" &&
    typeof imageHeight === "number" &&
    Number.isFinite(imageWidth) &&
    Number.isFinite(imageHeight) &&
    imageWidth > 0 &&
    imageHeight > 0;

  return {
    imageUrl: result.backgroundRemovedImage,
    sourceSize: hasSize
      ? {
          width: imageWidth,
          height: imageHeight,
        }
      : null,
  };
}
