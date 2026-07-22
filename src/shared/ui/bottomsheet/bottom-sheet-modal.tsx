import {
  BottomSheet as ExpoBottomSheet,
  BottomSheetView as ExpoBottomSheetView,
} from "@expo/ui/community/bottom-sheet";
import { ReactNode } from "react";

const DEFAULT_SNAP_POINTS: string[] = ["50%", "100%"];
const BOTTOM_SHEET_BACKGROUND_STYLE = {
  backgroundColor: "white",
};

export interface BottomSheetModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: string[];
  isPanDownToCloseEnabled?: boolean;
}

export function BottomSheetModal({
  open,
  onClose,
  children,
  snapPoints = DEFAULT_SNAP_POINTS,
  isPanDownToCloseEnabled = true,
}: BottomSheetModalProps) {
  return (
    <ExpoBottomSheet
      index={open ? 0 : -1}
      onClose={onClose}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={isPanDownToCloseEnabled}
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
