import {
  BottomSheet as ExpoBottomSheet,
  BottomSheetView as ExpoBottomSheetView,
} from "@expo/ui/community/bottom-sheet";
import type { ReactNode } from "react";
import {
  resolveBottomSheetPresentation,
  type BottomSheetSnapPoint,
} from "./bottom-sheet-presentation";

const DEFAULT_SNAP_POINTS: BottomSheetSnapPoint[] = ["50%", "100%"];
const BOTTOM_SHEET_BACKGROUND_STYLE = {
  backgroundColor: "white",
};

interface BottomSheetModalBaseProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

type ResizableBottomSheetModalProps = {
  snapPoints?: BottomSheetSnapPoint[];
  lockedSnapPoint?: never;
  isPanDownToCloseEnabled?: boolean;
};

type LockedBottomSheetModalProps = {
  lockedSnapPoint: BottomSheetSnapPoint;
  snapPoints?: never;
  isPanDownToCloseEnabled?: never;
};

export type BottomSheetModalProps = BottomSheetModalBaseProps &
  (ResizableBottomSheetModalProps | LockedBottomSheetModalProps);

export function BottomSheetModal({
  open,
  onClose,
  children,
  snapPoints = DEFAULT_SNAP_POINTS,
  lockedSnapPoint,
  isPanDownToCloseEnabled = true,
}: BottomSheetModalProps) {
  const presentation = resolveBottomSheetPresentation({
    platform: process.env.EXPO_OS,
    snapPoints,
    lockedSnapPoint,
    isPanDownToCloseEnabled,
  });

  return (
    <ExpoBottomSheet
      index={open ? 0 : -1}
      onClose={onClose}
      snapPoints={presentation.snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={
        presentation.isPanDownToCloseEnabled
      }
      backgroundStyle={BOTTOM_SHEET_BACKGROUND_STYLE}
    >
      <ExpoBottomSheetView
        style={{
          flexGrow: 1,
          height: 0,
          overflow: "hidden",
        }}
      >
        {children}
      </ExpoBottomSheetView>
    </ExpoBottomSheet>
  );
}
