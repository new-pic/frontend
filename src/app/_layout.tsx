import { registerGlobals } from "@livekit/react-native";
import {
  createCameraJoinPath,
  createRtcJoinPath,
  RTC_NAVIGATION,
  RtcNavigationSearchParams,
} from "@shared/config";
import {
  getFirstSearchParam,
  normalizeAuthReturnTo,
} from "@shared/lib";
import { GluestackUIProvider } from "@shared/ui/gluestack-ui-provider";
import { useFonts } from "expo-font";
import {
  Href,
  router,
  Stack,
  useGlobalSearchParams,
  usePathname,
} from "expo-router";

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
  const searchParams = useGlobalSearchParams<
    RtcNavigationSearchParams & {
      returnTo?: string | string[];
    }
  >();
  const codeParam =
    searchParams[RTC_NAVIGATION.params.code];
  const joinSheetParam =
    searchParams[RTC_NAVIGATION.params.joinSheet];
  const returnToParam = searchParams.returnTo;

  const initializeAuthState = useAuthStore(
    (state) => state.initializeAuthState,
  );
  const accessToken = useAuthStore(
    (state) => state.accessToken,
  );
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

    const code = getFirstSearchParam(codeParam);
    const joinSheet = getFirstSearchParam(joinSheetParam);
    let currentReturnTo = pathname;

    if (pathname === RTC_NAVIGATION.paths.join && code) {
      currentReturnTo = createRtcJoinPath(code);
    } else if (
      pathname === RTC_NAVIGATION.paths.camera &&
      joinSheet === RTC_NAVIGATION.values.joinSheetOpen
    ) {
      currentReturnTo = createCameraJoinPath(code);
    }

    // 앱 access token이 없으면 RTC 경로도 포함해 로그인 화면으로 이동하고,
    // 로그인 완료 뒤 현재 내부 경로로 복귀합니다.
    if (!accessToken && pathname !== "/") {
      router.replace({
        pathname: "/",
        params: {
          returnTo: normalizeAuthReturnTo(currentReturnTo),
        },
      } as Href);
    }
    // 이미 인증된 사용자가 로그인 화면에 진입하면 요청했던 화면으로 복귀합니다.
    else if (accessToken && pathname === "/") {
      router.replace(
        normalizeAuthReturnTo(returnToParam) as Href,
      );
    }
  }, [
    accessToken,
    codeParam,
    isInitialized,
    joinSheetParam,
    pathname,
    returnToParam,
  ]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerShown: false,
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
