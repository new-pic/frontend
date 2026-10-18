import { colors } from "@shared/ui/theme";
import { useAppTranslation } from "@shared/lib";
import {
  IconCameraFilled,
  IconLayoutGridFilled,
  IconUserFilled,
} from "@tabler/icons-react-native";
import { Tabs, usePathname } from "expo-router";

export default function TabLayout() {
  const { t } = useAppTranslation();
  const pathname = usePathname();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 10,
        },
        headerShown: false,
        sceneStyle: { backgroundColor: "white" },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: t("tabs.feed"),
          tabBarIcon: ({ color }) => (
            <IconLayoutGridFilled color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed/edit"
        options={{
          tabBarStyle: { display: "none" },
          href: null,
        }}
      />
      <Tabs.Screen
        name="feed/edit/[id]"
        options={{
          tabBarStyle: { display: "none" },
          href: null,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: t("tabs.camera"),
          tabBarStyle: { display: "none" },
          tabBarIcon: ({ color }) => (
            <IconCameraFilled color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarStyle:
            pathname === "/profile" ? undefined : { display: "none" },
          tabBarIcon: ({ color }) => <IconUserFilled color={color} size={28} />,
        }}
      />
    </Tabs>
  );
}
