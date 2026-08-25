import { BottomSheetModal, VStack } from "@shared/ui";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RtcJoinForm, RtcJoinFormHeader } from "./rtc-join-form";

interface RtcJoinSheetProps {
  open: boolean;
  onClose: () => void;
  initialCode?: string;
}

export function RtcJoinSheet({
  open,
  onClose,
  initialCode,
}: RtcJoinSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetModal open={open} onClose={onClose} lockedSnapPoint="50%">
      <VStack
        className="flex-1 gap-5 px-6 pt-4"
        style={{ paddingBottom: Math.max(24, insets.bottom) }}
      >
        <RtcJoinFormHeader />
        <ScrollView
          style={{ flex: 1 }}
          nestedScrollEnabled
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 8,
          }}
        >
          <RtcJoinForm
            initialCode={initialCode}
            loginReturnRoute="camera"
            onCancel={onClose}
            showHeader={false}
          />
        </ScrollView>
      </VStack>
    </BottomSheetModal>
  );
}
