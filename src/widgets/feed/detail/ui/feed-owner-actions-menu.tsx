import { useDeleteFeed } from "@features/feed/delete-feed";
import { useEditFeed } from "@features/feed/edit-feed";
import { colors } from "@shared/constants";
import { Button, ButtonIcon, Pressable, Text } from "@shared/ui";
import { IconDotsVertical } from "@tabler/icons-react-native";
import { useRef, useState } from "react";
import {
  Modal,
  Pressable as NativePressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

interface FeedOwnerActionsMenuProps {
  feedId: string;
}

export function FeedOwnerActionsMenu({
  feedId,
}: FeedOwnerActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 52,
    right: 20,
  });
  const triggerRef = useRef<View>(null);
  const { width: windowWidth } = useWindowDimensions();
  const editFeed = useEditFeed(feedId);
  const { deleteFeed, isDeleting } = useDeleteFeed(feedId);

  const handleOpen = () => {
    if (!triggerRef.current) {
      setIsOpen(true);
      return;
    }

    triggerRef.current.measureInWindow((x, y, width, height) => {
      setMenuPosition({
        top: y + height + 4,
        right: Math.max(12, windowWidth - x - width),
      });
      setIsOpen(true);
    });
  };

  const handleEdit = () => {
    setIsOpen(false);
    editFeed();
  };

  const handleDelete = () => {
    setIsOpen(false);
    void deleteFeed();
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          accessibilityLabel="피드 더보기"
          accessibilityHint="수정 및 삭제 메뉴를 엽니다"
          accessibilityState={{ expanded: isOpen }}
          onPress={handleOpen}
        >
          <ButtonIcon as={IconDotsVertical} className="h-6 w-6" />
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
            accessibilityLabel="피드 더보기 메뉴 닫기"
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOpen(false)}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.menu,
              menuPosition,
            ]}
          >
            <Pressable
              accessibilityRole="menuitem"
              onPress={handleEdit}
              style={styles.menuItem}
            >
              <Text className="font-medium">수정하기</Text>
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              accessibilityRole="menuitem"
              disabled={isDeleting}
              onPress={handleDelete}
              style={styles.menuItem}
            >
              <Text
                className="font-medium"
                style={{ color: "#dc2626" }}
              >
                삭제하기
              </Text>
            </Pressable>
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
    right: 20,
    width: 152,
    overflow: "hidden",
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "white",
    boxShadow: "0 5px 18px rgba(0,0,0,0.18)",
  },
  menuItem: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outline,
  },
});
