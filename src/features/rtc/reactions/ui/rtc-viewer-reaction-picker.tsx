import { rtcQuery } from "@entities/rtc";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { adaptRtcReactionEmojis } from "../lib/rtc-reaction-domain";
import { useRtcReactionChannel } from "../model/use-rtc-reaction-channel";
import { RtcViewerReactionButton } from "./rtc-viewer-reaction-button";

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
  const canSend = channel.status === "CONNECTED" && emojis.length > 0;

  if (!active) return null;

  return (
    <View pointerEvents="box-none" className="w-full items-center bg-white">
      <View className="min-h-16 w-full justify-center">
        {emojiQuery.isError ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이모지 목록 다시 불러오기"
            onPress={() => void emojiQuery.refetch()}
            className="self-center px-5 py-3"
          >
            <Text className="text-sm text-label-muted">
              반응을 불러오지 못함 · 다시 시도
            </Text>
          </Pressable>
        ) : channel.status === "ERROR" ? (
          <Text className="self-center px-5 py-3 text-sm text-label-muted">
            반응 서버 다시 연결 중...
          </Text>
        ) : (
          <ScrollView
            horizontal
            style={{ width: "100%" }}
            contentContainerStyle={{
              alignItems: "center",
              flexGrow: 1,
              gap: 12,
              justifyContent: "center",
              paddingHorizontal: 20,
              paddingVertical: 6,
            }}
            showsHorizontalScrollIndicator={false}
          >
            {emojis.map((emoji) => (
              <RtcViewerReactionButton
                key={emoji.id}
                emoji={emoji}
                disabled={!canSend}
                onSend={channel.sendReaction}
              />
            ))}
            {emojis.length === 0 && !emojiQuery.isError ? (
              <Text className="px-3 text-sm text-label-muted">
                반응 불러오는 중...
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
