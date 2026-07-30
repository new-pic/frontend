import {
  calculateCanvasRenderRect,
  type CoordinateSize,
  type PreviewPoint,
} from "../../pose-matching";
import type {
  CameraGuideContour,
  CameraGuideOutline,
} from "../model/types";

export interface ProjectedCameraGuideContour
  extends Omit<CameraGuideContour, "points"> {
  points: PreviewPoint[];
}

export function projectGuideOutlineToPreview(
  outline: CameraGuideOutline,
  previewSize: CoordinateSize,
): ProjectedCameraGuideContour[] {
  const renderRect = calculateCanvasRenderRect(
    outline.sourceSize,
    previewSize,
    "cover",
  );

  return outline.contours.map((contour) => ({
    ...contour,
    points: contour.points.map(({ x, y }) => ({
      x: renderRect.x + x * renderRect.width,
      y: renderRect.y + y * renderRect.height,
    })),
  }));
}

function formatPathCoordinate(value: number) {
  return Number(value.toFixed(3));
}

export function createGuideContourPath(
  contour: ProjectedCameraGuideContour,
) {
  if (contour.points.length === 0) return "";

  const [first, ...rest] = contour.points;
  const commands = [
    `M ${formatPathCoordinate(first.x)} ${formatPathCoordinate(first.y)}`,
    ...rest.map(
      ({ x, y }) =>
        `L ${formatPathCoordinate(x)} ${formatPathCoordinate(y)}`,
    ),
  ];

  if (contour.closed) {
    commands.push("Z");
  }
  return commands.join(" ");
}
