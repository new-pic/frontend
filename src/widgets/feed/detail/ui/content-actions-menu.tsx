import { colors } from "@shared/constants";
import { Button, ButtonIcon, Pressable, Text } from "@shared/ui";
import { IconDotsVertical } from "@tabler/icons-react-native";
import { useEffect, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Modal,
  Pressable as NativePressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  CONTENT_ACTION_MENU_EDGE_INSET,
  CONTENT_ACTION_MENU_TRIGGER_GAP,
  getContentActionMenuTop,
} from "../model/content-action-menu-layout";

export interface ContentActionMenuItem {
  key: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

const MENU_DISMISS_DELAY_MS = 200;

interface TriggerLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  const [triggerLayout, setTriggerLayout] = useState<TriggerLayout | null>(null);
  const [menuHeight, setMenuHeight] = useState<number | null>(null);
  const triggerRef = useRef<View>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMenuPositioned = !triggerLayout || menuHeight !== null;
  const menuPosition = triggerLayout
    ? {
        top:
          menuHeight === null
            ? triggerLayout.y +
              triggerLayout.height +
              CONTENT_ACTION_MENU_TRIGGER_GAP
            : getContentActionMenuTop({
                triggerY: triggerLayout.y,
                triggerHeight: triggerLayout.height,
                menuHeight,
                windowHeight,
              }),
        right: Math.max(
          CONTENT_ACTION_MENU_EDGE_INSET,
          windowWidth - triggerLayout.x - triggerLayout.width,
        ),
      }
    : { top: 52, right: 20 };

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
      setTriggerLayout(null);
      setMenuHeight(null);
      setIsOpen(true);
      return;
    }

    triggerRef.current.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setMenuHeight(null);
      setIsOpen(true);
    });
  };

  const handleMenuLayout = (event: LayoutChangeEvent) => {
    setMenuHeight(event.nativeEvent.layout.height);
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
            pointerEvents={isMenuPositioned ? "auto" : "none"}
            style={[
              styles.menu,
              menuPosition,
              !isMenuPositioned && styles.measuringMenu,
            ]}
            onLayout={handleMenuLayout}
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
  measuringMenu: {
    opacity: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outline,
  },
  destructiveText: {
    color: "#dc2626",
  },
});
