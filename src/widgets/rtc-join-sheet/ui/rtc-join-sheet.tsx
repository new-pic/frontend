import { RtcJoinForm } from "@features/rtc/join-room";
import {
  BottomSheetModal,
} from "@shared/ui";
import {
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";

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
  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      snapPoints={["52%", "82%"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          process.env.EXPO_OS === "ios" ? "padding" : undefined
        }
      >
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingBottom: 32,
            paddingTop: 20,
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
