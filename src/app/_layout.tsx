import { GluestackUIProvider } from "@shared/ui/gluestack-ui-provider";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";

import "./global.css";

export default function RootLayout() {
  const [loaded] = useFonts({
    "Paperlogy-1Thin": require("@assets/fonts/Paperlogy-1Thin.ttf"),
    "Paperlogy-2ExtraLight": require("@assets/fonts/Paperlogy-2ExtraLight.ttf"),
    "Paperlogy-3Light": require("@assets/fonts/Paperlogy-3Light.ttf"),
    "Paperlogy-4Regular": require("@assets/fonts/Paperlogy-4Regular.ttf"),
    "Paperlogy-5Medium": require("@assets/fonts/Paperlogy-5Medium.ttf"),
    "Paperlogy-6SemiBold": require("@assets/fonts/Paperlogy-6SemiBold.ttf"),
    "Paperlogy-7Bold": require("@assets/fonts/Paperlogy-7Bold.ttf"),
    "Paperlogy-8ExtraBold": require("@assets/fonts/Paperlogy-8ExtraBold.ttf"),
    "Paperlogy-9Black": require("@assets/fonts/Paperlogy-9Black.ttf"),
  });

  if (!loaded) return null;

  return (
    <GluestackUIProvider>
      <Stack screenOptions={{ header: () => <></> }} />
    </GluestackUIProvider>
  );
}
