import { GluestackUIProvider } from "@shared/ui/gluestack-ui-provider";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";

import { ConfirmProvider } from "@shared/lib";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./global.css";

import "@shared/api/interceptors";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient();

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider>
        <QueryClientProvider client={queryClient}>
          <ConfirmProvider>
            <Stack
              screenOptions={{
                header: () => <></>,
                contentStyle: { backgroundColor: "white" },
              }}
            >
              <Stack.Screen name="auth/setup" />
            </Stack>
          </ConfirmProvider>
        </QueryClientProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
