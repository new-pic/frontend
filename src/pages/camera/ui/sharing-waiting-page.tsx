import { Box, Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface SharingWaitingPageProps {
  hostNickname?: string;
  onCancel: () => void;
  isConnecting?: boolean;
}

export function SharingWaitingPage({
  hostNickname,
  onCancel,
  isConnecting = false,
}: SharingWaitingPageProps) {
  const displayHostNickname = hostNickname?.trim() || "호스트";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <VStack className="flex-1 bg-white">
        <Center className="flex-1 px-8 pb-12">
          <VStack className="w-full items-center gap-12">
            <Image
              source={require("@assets/images/icon.png")}
              accessibilityLabel="뉴픽 앱 아이콘"
              className="h-40 w-40"
              resizeMode="contain"
            />

            <VStack className="items-center gap-5">
              <Text size="xl" bold className="text-center text-foreground">
                {displayHostNickname}님이 공유 대기 중입니다...
              </Text>
              {isConnecting && (
                <ActivityIndicator
                  size="small"
                  color="#ff7c82"
                  accessibilityLabel="실시간 공유 연결 중"
                />
              )}
              <Text size="lg" className="text-center text-outline">
                {isConnecting
                  ? "실시간 공유에 연결하고 있어요"
                  : "잠시만 기다려주세요"}
              </Text>
            </VStack>

            <Button
              variant="outline"
              size="lg"
              className="min-w-48"
              onPress={onCancel}
              accessibilityLabel="실시간 공유 대기 취소"
            >
              <ButtonText>취소하기</ButtonText>
            </Button>
          </VStack>
        </Center>

        <Box
          className="h-24 w-full bg-outline-light"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </VStack>
    </SafeAreaView>
  );
}
