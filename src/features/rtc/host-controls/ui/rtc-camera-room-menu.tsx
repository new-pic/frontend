import type { RtcRoomParticipant } from "@entities/rtc-room";
import { useAppTranslation } from "@shared/lib";
import { colors } from "@shared/ui/theme";
import { Button, ButtonIcon, Image, Pressable, Text } from "@shared/ui";
import {
  IconBroadcast,
  IconUserFilled,
  IconUsersPlus,
} from "@tabler/icons-react-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable as NativePressable,
  StyleSheet,
  View,
  type ViewStyle,
  useWindowDimensions,
} from "react-native";
import { resolveRtcCameraMenuMode } from "../model/rtc-host-control";

const PARTICIPANT_ROW_HEIGHT = 52;
const MAX_VISIBLE_PARTICIPANTS = 5;
const OVERLAY_ICON_SHADOW_STYLE = {
  filter: [
    {
      dropShadow: {
        offsetX: 0,
        offsetY: 2,
        standardDeviation: 2,
        color: "rgba(0,0,0,0.55)",
      },
    },
  ],
} satisfies ViewStyle;

interface RtcCameraRoomMenuProps {
  participants: RtcRoomParticipant[];
  isLive: boolean;
  isBusy: boolean;
  isCameraReady: boolean;
  appearance?: "inline" | "overlay";
  onJoinPress: () => void;
  onSharePress: () => void;
  onEndRoomPress: () => void;
}

export function RtcCameraRoomMenu({
  participants,
  isLive,
  isBusy,
  isCameraReady,
  appearance = "inline",
  onJoinPress,
  onSharePress,
  onEndRoomPress,
}: RtcCameraRoomMenuProps) {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 52,
    right: 12,
  });
  const triggerRef = useRef<View>(null);
  const { width: windowWidth } = useWindowDimensions();
  const mode = resolveRtcCameraMenuMode({ isBusy, isLive });
  const isOverlay = appearance === "overlay";

  const handleOpen = () => {
    if (isBusy) return;
    if (!triggerRef.current) {
      setIsOpen(true);
      return;
    }

    triggerRef.current.measureInWindow((x, y, width, height) => {
      setMenuPosition({
        top: y + height + 6,
        right: Math.max(12, windowWidth - x - width),
      });
      setIsOpen(true);
    });
  };

  const runAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          style={isOverlay ? OVERLAY_ICON_SHADOW_STYLE : undefined}
          disabled={isBusy}
          accessibilityLabel={
            mode === "LIVE"
              ? t("rtc.host.liveParticipantCount", {
                  count: participants.length,
                })
              : mode === "BUSY"
                ? t("rtc.host.changingState")
                : t("rtc.host.shareCamera")
          }
          accessibilityState={{
            disabled: isBusy,
            expanded: isOpen,
          }}
          onPress={handleOpen}
        >
          {mode === "BUSY" ? (
            <ActivityIndicator
              size="small"
              color={isOverlay ? "white" : "#111111"}
            />
          ) : (
            <ButtonIcon
              as={mode === "LIVE" ? IconBroadcast : IconUsersPlus}
              className="h-6 w-6"
              style={{
                color: isOverlay
                  ? "white"
                  : mode === "LIVE"
                    ? colors.brand.primary
                    : "#111111",
              }}
            />
          )}
        </Button>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isOpen}
        statusBarTranslucent
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1">
          <NativePressable
            accessibilityLabel={t("rtc.host.closeMenu")}
            className="absolute inset-0"
            onPress={() => setIsOpen(false)}
          />
          <View
            accessibilityViewIsModal
            className="absolute w-68 overflow-hidden rounded-2xl bg-white shadow-hard-2"
            style={{
              ...menuPosition,
              borderCurve: "continuous",
            }}
          >
            {mode === "LIVE" ? (
              <>
                <Text className="px-4 pb-2 pt-4 font-paperlogy-semibold">
                  {t("rtc.host.participants", {
                    count: participants.length,
                  })}
                </Text>
                {participants.length > 0 ? (
                  <FlatList
                    data={participants}
                    keyExtractor={(participant, index) =>
                      `${participant.nickname}-${index}`
                    }
                    nestedScrollEnabled
                    style={{
                      maxHeight:
                        PARTICIPANT_ROW_HEIGHT * MAX_VISIBLE_PARTICIPANTS,
                    }}
                    renderItem={({ item }) => (
                      <View className="h-13 flex-row items-center gap-3 px-4">
                        {item.profileImage ? (
                          <Image
                            source={item.profileImage}
                            contentFit="cover"
                            className="h-9 w-9 rounded-full"
                          />
                        ) : (
                          <View className="h-9 w-9 items-center justify-center rounded-full bg-outline">
                            <IconUserFilled size={20} color="white" />
                          </View>
                        )}
                        <Text
                          numberOfLines={1}
                          className="flex-1 font-paperlogy-medium"
                        >
                          {item.nickname}
                        </Text>
                      </View>
                    )}
                  />
                ) : (
                  <Text className="px-4 pb-4 text-label-muted">
                    {t("rtc.host.noParticipants")}
                  </Text>
                )}
                <View
                  className="bg-outline"
                  style={{ height: StyleSheet.hairlineWidth }}
                />
                <Pressable
                  accessibilityRole="menuitem"
                  onPress={() => runAction(onEndRoomPress)}
                  className="min-h-13 justify-center px-[1.125rem]"
                >
                  <Text className="font-paperlogy-semibold text-red-600">
                    {t("rtc.host.endRoom")}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="menuitem"
                  onPress={() => runAction(onJoinPress)}
                  className="min-h-13 justify-center px-[1.125rem]"
                >
                  <Text className="font-paperlogy-medium">
                    {t("rtc.host.join")}
                  </Text>
                </Pressable>
                <View
                  className="bg-outline"
                  style={{ height: StyleSheet.hairlineWidth }}
                />
                <Pressable
                  accessibilityRole="menuitem"
                  disabled={!isCameraReady}
                  onPress={() => runAction(onSharePress)}
                  className="min-h-13 justify-center px-[1.125rem]"
                >
                  <Text
                    className={
                      isCameraReady
                        ? "font-paperlogy-medium"
                        : "font-paperlogy-medium text-label-muted"
                    }
                  >
                    {isCameraReady
                      ? t("rtc.host.shareLive")
                      : t("rtc.host.cameraPreparing")}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
