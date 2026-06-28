import { colors } from "@shared/constants";
import {
  IconCameraFilled,
  IconLayoutGridFilled,
  IconUserFilled,
} from "@tabler/icons-react-native";
import { Tabs } from "expo-router";

export default function TabLayout() {
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
          title: "피드",
          tabBarIcon: ({ color }) => (
            <IconLayoutGridFilled color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "카메라",
          tabBarStyle: { display: "none" },
          tabBarIcon: ({ color }) => (
            <IconCameraFilled color={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "프로필",
          tabBarIcon: ({ color }) => <IconUserFilled color={color} size={28} />,
        }}
      />
    </Tabs>
  );
}
