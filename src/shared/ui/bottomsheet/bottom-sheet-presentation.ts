export type BottomSheetSnapPoint = string | number;

interface ResolveBottomSheetPresentationParams {
  platform: string | undefined;
  snapPoints: BottomSheetSnapPoint[];
  lockedSnapPoint?: BottomSheetSnapPoint;
  isPanDownToCloseEnabled: boolean;
}

interface BottomSheetPresentation {
  snapPoints: BottomSheetSnapPoint[];
  isPanDownToCloseEnabled: boolean;
}

export function resolveBottomSheetPresentation({
  platform,
  snapPoints,
  lockedSnapPoint,
  isPanDownToCloseEnabled,
}: ResolveBottomSheetPresentationParams): BottomSheetPresentation {
  if (lockedSnapPoint === undefined) {
    return {
      snapPoints,
      isPanDownToCloseEnabled,
    };
  }

  return {
    snapPoints:
      platform === "android" ? [lockedSnapPoint, "100%"] : [lockedSnapPoint],
    isPanDownToCloseEnabled: false,
  };
}
