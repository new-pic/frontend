import { colors } from "@shared/constants";
import { Button, ButtonIcon, Pressable, Text } from "@shared/ui";
import { IconDotsVertical } from "@tabler/icons-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable as NativePressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

export interface ContentActionMenuItem {
  key: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

const MENU_DISMISS_DELAY_MS = 200;

interface ContentActionsMenuProps {
  accessibilityLabel: string;
  accessibilityHint: string;
  items: ContentActionMenuItem[];
  iconClassName?: string;
}

export function ContentActionsMenu({
  accessibilityLabel,
  accessibilityHint,
  items,
  iconClassName = "h-6 w-6",
}: ContentActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 52,
    right: 20,
  });
  const triggerRef = useRef<View>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width: windowWidth } = useWindowDimensions();

  useEffect(
    () => () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    },
    [],
  );

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

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ expanded: isOpen }}
          onPress={handleOpen}
        >
          <ButtonIcon as={IconDotsVertical} className={iconClassName} />
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
            accessibilityLabel={`${accessibilityLabel} 메뉴 닫기`}
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOpen(false)}
          />
          <View
            accessibilityRole="menu"
            accessibilityViewIsModal
            style={[styles.menu, menuPosition]}
          >
            {items.map((item, index) => (
              <View key={item.key}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <Pressable
                  accessibilityRole="menuitem"
                  disabled={item.disabled}
                  onPress={() => {
                    setIsOpen(false);
                    actionTimeoutRef.current = setTimeout(() => {
                      actionTimeoutRef.current = null;
                      item.onPress();
                    }, MENU_DISMISS_DELAY_MS);
                  }}
                  style={styles.menuItem}
                >
                  <Text
                    className="font-medium"
                    style={item.destructive ? styles.destructiveText : undefined}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              </View>
            ))}
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
  destructiveText: {
    color: "#dc2626",
  },
});
