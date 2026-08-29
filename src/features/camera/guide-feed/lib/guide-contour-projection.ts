import {
  calculateCanvasRenderRect,
  type CoordinateSize,
  type PreviewPoint,
} from "./pose-matching";
import type { CameraGuideContour, CameraGuideOutline } from "../model/types";

export interface ProjectedCameraGuideContour extends Omit<
  CameraGuideContour,
  "points"
> {
  points: PreviewPoint[];
}

export function projectGuideSourceToPreviewRect(
  sourceSize: CoordinateSize,
  previewSize: CoordinateSize,
) {
  return calculateCanvasRenderRect(sourceSize, previewSize, "cover");
}

export function projectGuideOutlineToPreview(
  outline: CameraGuideOutline,
  previewSize: CoordinateSize,
): ProjectedCameraGuideContour[] {
  const renderRect = projectGuideSourceToPreviewRect(
    outline.sourceSize,
    previewSize,
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

function formatPoint({ x, y }: PreviewPoint) {
  return `${formatPathCoordinate(x)} ${formatPathCoordinate(y)}`;
}

function midpoint(first: PreviewPoint, second: PreviewPoint) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function createGuideContourPath(contour: ProjectedCameraGuideContour) {
  if (contour.points.length === 0) return "";

  const { points } = contour;
  const [first] = points;
  if (points.length === 1) {
    return `M ${formatPoint(first)}`;
  }
  if (points.length === 2) {
    const commands = [`M ${formatPoint(first)}`, `L ${formatPoint(points[1])}`];
    if (contour.closed) commands.push("Z");
    return commands.join(" ");
  }

  if (contour.closed) {
    const last = points[points.length - 1];
    const commands = [`M ${formatPoint(midpoint(last, first))}`];

    for (const [index, point] of points.entries()) {
      const next = points[(index + 1) % points.length];
      commands.push(
        `Q ${formatPoint(point)} ${formatPoint(midpoint(point, next))}`,
      );
    }
    commands.push("Z");
    return commands.join(" ");
  }

  const commands = [`M ${formatPoint(first)}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    commands.push(
      `Q ${formatPoint(point)} ${formatPoint(midpoint(point, next))}`,
    );
  }
  const last = points[points.length - 1];
  commands.push(`Q ${formatPoint(last)} ${formatPoint(last)}`);
  return commands.join(" ");
}
