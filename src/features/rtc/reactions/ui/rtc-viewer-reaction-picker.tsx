import { rtcQuery } from "@entities/rtc";
import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { adaptRtcReactionEmojis } from "../lib/rtc-reaction-domain";
import { useRtcReactionChannel } from "../model/use-rtc-reaction-channel";

interface RtcViewerReactionPickerProps {
  active: boolean;
  roomId: string;
  participantId: string;
}

export function RtcViewerReactionPicker({
  active,
  roomId,
  participantId,
}: RtcViewerReactionPickerProps) {
  const emojiQuery = rtcQuery.useReadFeedbackEmojis();
  const emojis = useMemo(
    () => adaptRtcReactionEmojis(emojiQuery.data),
    [emojiQuery.data],
  );
  const channel = useRtcReactionChannel({
    active,
    roomId,
    role: "VIEWER",
    participantId,
  });
  const canSend =
    channel.status === "CONNECTED" && emojis.length > 0;

  if (!active) return null;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View style={styles.panel}>
        {emojiQuery.isError ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이모지 목록 다시 불러오기"
            onPress={() => void emojiQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.statusText}>
              반응을 불러오지 못함 · 다시 시도
            </Text>
          </Pressable>
        ) : channel.status === "ERROR" ? (
          <Text style={styles.connectionStatusText}>
            반응 서버 다시 연결 중...
          </Text>
        ) : (
          <ScrollView
            horizontal
            contentContainerStyle={styles.emojiList}
            showsHorizontalScrollIndicator={false}
          >
            {emojis.map((emoji) => (
              <Pressable
                key={emoji.id}
                accessibilityRole="button"
                accessibilityLabel={`${emoji.label} 반응 보내기`}
                disabled={!canSend}
                onPress={() => channel.sendReaction(emoji.id)}
                style={({ pressed }) => [
                  styles.emojiButton,
                  !canSend && styles.disabled,
                  pressed && canSend && styles.pressed,
                ]}
              >
                <Text style={styles.emoji}>{emoji.symbol}</Text>
              </Pressable>
            ))}
            {emojis.length === 0 && !emojiQuery.isError ? (
              <Text style={styles.statusText}>
                반응 불러오는 중...
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    right: 0,
    bottom: 104,
    left: 0,
    zIndex: 20,
    alignItems: "center",
  },
  panel: {
    maxWidth: "92%",
    minHeight: 58,
    justifyContent: "center",
    borderRadius: 29,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    paddingHorizontal: 8,
  },
  emojiList: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  emojiButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
  },
  emoji: {
    fontSize: 30,
    lineHeight: 38,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.9 }],
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  statusText: {
    color: "white",
    fontSize: 13,
    paddingHorizontal: 12,
  },
  connectionStatusText: {
    color: "white",
    fontSize: 13,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
});
