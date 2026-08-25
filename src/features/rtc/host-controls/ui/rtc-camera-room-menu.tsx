import type { RtcRoomParticipant } from "@entities/rtc";
import { colors } from "@shared/ui/theme";
import { Button, ButtonIcon, Pressable, Text } from "@shared/ui";
import {
  IconBroadcast,
  IconUserFilled,
  IconUsersPlus,
} from "@tabler/icons-react-native";
import { Image } from "expo-image";
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
              ? `실시간 공유 중, 참여자 ${participants.length}명`
              : mode === "BUSY"
                ? "실시간 공유 상태 변경 중"
                : "사람들과 촬영 화면 공유"
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
        <View style={styles.modal}>
          <NativePressable
            accessibilityLabel="RTC 공유 메뉴 닫기"
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOpen(false)}
          />
          <View accessibilityViewIsModal style={[styles.menu, menuPosition]}>
            {mode === "LIVE" ? (
              <>
                <Text className="px-4 pb-2 pt-4 font-semibold">
                  참여자 {participants.length}명
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
                      <View style={styles.participantRow}>
                        {item.profileImage ? (
                          <Image
                            source={item.profileImage}
                            contentFit="cover"
                            style={styles.profileImage}
                          />
                        ) : (
                          <View style={styles.profileFallback}>
                            <IconUserFilled size={20} color="white" />
                          </View>
                        )}
                        <Text numberOfLines={1} className="flex-1 font-medium">
                          {item.nickname}
                        </Text>
                      </View>
                    )}
                  />
                ) : (
                  <Text className="px-4 pb-4 text-label-muted">
                    아직 참여자가 없습니다.
                  </Text>
                )}
                <View style={styles.separator} />
                <Pressable
                  accessibilityRole="menuitem"
                  onPress={() => runAction(onEndRoomPress)}
                  style={styles.menuItem}
                >
                  <Text className="font-semibold" style={{ color: "#dc2626" }}>
                    방 종료하기
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="menuitem"
                  onPress={() => runAction(onJoinPress)}
                  style={styles.menuItem}
                >
                  <Text className="font-medium">참여하기</Text>
                </Pressable>
                <View style={styles.separator} />
                <Pressable
                  accessibilityRole="menuitem"
                  disabled={!isCameraReady}
                  onPress={() => runAction(onSharePress)}
                  style={styles.menuItem}
                >
                  <Text
                    className={
                      isCameraReady
                        ? "font-medium"
                        : "font-medium text-label-muted"
                    }
                  >
                    {isCameraReady ? "실시간 공유하기" : "카메라 준비 중"}
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

const styles = StyleSheet.create({
  modal: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    width: 272,
    overflow: "hidden",
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "white",
    boxShadow: "0 5px 18px rgba(0,0,0,0.2)",
  },
  menuItem: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  participantRow: {
    height: PARTICIPANT_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profileFallback: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.outline,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outline,
  },
});
