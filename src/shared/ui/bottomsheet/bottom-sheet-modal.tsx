import {
  BottomSheetModal as ExpoBottomSheetModal,
  BottomSheetView as ExpoBottomSheetView,
} from "@expo/ui/community/bottom-sheet";
import { ReactNode, useEffect, useRef } from "react";

const DEFAULT_SNAP_POINTS: string[] = ["50%", "100%"];

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
  const sheetRef = useRef<ExpoBottomSheetModal>(null);

  useEffect(() => {
    if (open) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [open]);
  return (
    <ExpoBottomSheetModal
      ref={sheetRef}
      onClose={onClose}
      snapPoints={snapPoints}
      enablePanDownToClose={isPanDownToCloseEnabled}
    >
      <ExpoBottomSheetView>{children}</ExpoBottomSheetView>
    </ExpoBottomSheetModal>
  );
}
