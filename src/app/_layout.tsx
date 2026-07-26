import { GluestackUIProvider } from "@shared/ui/gluestack-ui-provider";
import { registerGlobals } from "@livekit/react-native";
import { useFonts } from "expo-font";
import { router, Stack, usePathname } from "expo-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./global.css";

import "@shared/api/interceptors";
import { useAuthStore } from "@shared/model";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

if (Platform.OS !== "web") {
  registerGlobals();
}

const queryClient = new QueryClient();

export default function RootLayout() {
  const pathname = usePathname();

  const initializeAuthState = useAuthStore(
    (state) => state.initializeAuthState,
  );
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isInitialized = useAuthStore((state) => state.isInitialized);

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

  useEffect(() => {
    const initializeAuth = async () => {
      await initializeAuthState();
    };
    initializeAuth();
  }, [initializeAuthState]);

  useEffect(() => {
    if (!isInitialized) return;

    const isPublicRtcPath =
      pathname === "/rtc/join" || pathname === "/rtc/viewer";

    // 로그인 되어있지 않고 루트 경로가 아닌 경우, 루트 경로로 이동
    if (!isLoggedIn && pathname !== "/" && !isPublicRtcPath) {
      router.replace("/");
    }
    // 로그인 되어있고 루트 경로인 경우, 피드 페이지로 이동
    else if (isLoggedIn && pathname === "/") {
      router.replace("/feed");
    }
  }, [isInitialized, isLoggedIn, pathname]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              header: () => <></>,
              contentStyle: { backgroundColor: "white" },
            }}
          >
            <Stack.Screen name="auth/setup" />
          </Stack>
        </QueryClientProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
