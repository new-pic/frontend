import { RtcJoinForm } from "@features/rtc/join-room";
import {
  BottomSheetModal,
} from "@shared/ui";
import {
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    <BottomSheetModal
      open={open}
      onClose={onClose}
      snapPoints={["48%", "82%"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          process.env.EXPO_OS === "ios" ? "padding" : undefined
        }
      >
        <ScrollView
          nestedScrollEnabled
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingBottom: Math.max(24, insets.bottom),
            paddingTop: 24,
          }}
        >
          <RtcJoinForm
            initialCode={initialCode}
            loginReturnRoute="camera"
            onCancel={onClose}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}
