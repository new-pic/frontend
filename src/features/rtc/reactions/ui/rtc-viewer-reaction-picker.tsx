import { useAppTranslation } from "@shared/lib";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { adaptRtcReactionEmojis } from "../lib/rtc-reaction-domain";
import { useRtcReactionChannel } from "../model/use-rtc-reaction-channel";
import { RtcViewerReactionButton } from "./rtc-viewer-reaction-button";
import { rtcReactionQuery } from "../api";

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
  const { t } = useAppTranslation();
  const {
    data,
    isError: isEmojiError,
    refetch: refetchEmojis,
  } = rtcReactionQuery.useReadFeedbackEmojis();
  const emojis = useMemo(() => adaptRtcReactionEmojis(data), [data]);
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
        {isEmojiError ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("rtc.reaction.retryListAccessibility")}
            onPress={() => void refetchEmojis()}
            className="self-center px-5 py-3"
          >
            <Text className="text-sm text-label-muted">
              {t("rtc.reaction.loadFailed")}
            </Text>
          </Pressable>
        ) : channel.status === "ERROR" ? (
          <Text className="self-center px-5 py-3 text-sm text-label-muted">
            {t("rtc.reaction.reconnecting")}
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
            {emojis.length === 0 && !isEmojiError ? (
              <Text className="px-3 text-sm text-label-muted">
                {t("rtc.reaction.loading")}
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
