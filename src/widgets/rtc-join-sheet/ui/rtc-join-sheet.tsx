import { RtcJoinForm } from "@features/rtc/join-room";
import { Box, Center } from "@shared/ui";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  if (!open) return null;

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 40,
        backgroundColor: "rgba(0, 0, 0, 0.35)",
      }}
    >
      <Pressable
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
        onPress={onClose}
        accessibilityLabel="참여 바텀시트 닫기"
      />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={
          process.env.EXPO_OS === "ios" ? "padding" : undefined
        }
      >
        <SafeAreaView
          edges={["bottom"]}
          style={{
            height: "52%",
            maxHeight: "64%",
            overflow: "hidden",
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            backgroundColor: "white",
          }}
        >
          <Center className="pb-3 pt-4">
            <Box className="h-1 w-20 rounded-full bg-outline-light" />
          </Center>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingBottom: 20,
            }}
          >
            <RtcJoinForm
              initialCode={initialCode}
              loginReturnRoute="camera"
              onCancel={onClose}
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Box>
  );
}
