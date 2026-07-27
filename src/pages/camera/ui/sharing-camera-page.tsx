import {
  Box,
  Button,
  ButtonSpinner,
  ButtonText,
  Center,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import { useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

export interface SharingCameraSheetProps {
  joinCode: string;
  qrValue: string;
  participantCount: number;
  participantNames?: string[];
  isStarting?: boolean;
  canStart?: boolean;
  onCancel: () => void;
  onStart: () => void;
}

export function SharingCameraSheet({
  joinCode,
  qrValue,
  participantCount,
  participantNames = [],
  isStarting = false,
  canStart = true,
  onCancel,
  onStart,
}: SharingCameraSheetProps) {
  const { width } = useWindowDimensions();
  const qrSize = Math.min(236, Math.max(176, width - 112));
  const visibleParticipantNames = participantNames
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 3);
  const safeParticipantCount = Math.max(0, participantCount);

  return (
    <Box className="absolute inset-0 z-30 justify-end bg-black/20">
      <SafeAreaView
        edges={["bottom"]}
        style={{
          height: "78%",
          backgroundColor: "white",
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <VStack className="flex-1 px-8 pb-3">
          <Center className="pt-5">
            <Box className="h-1 w-24 rounded-full bg-outline-light" />
          </Center>

          <Center className="flex-1">
            <VStack className="items-center gap-7">
              <Text size="xl" bold className="text-center text-foreground">
                실시간 찍히는 내용 공유하기
              </Text>

              <Box
                className="rounded-xl bg-white p-2"
                accessibilityLabel={`공유 QR 코드. 공유 코드는 ${joinCode}입니다.`}
              >
                <QRCode
                  value={qrValue}
                  size={qrSize}
                  backgroundColor="#ffffff"
                  color="#000000"
                />
              </Box>

              <Text size="lg" className="text-center text-foreground">
                공유 코드 : {joinCode}
              </Text>
            </VStack>
          </Center>

          <VStack className="gap-7">
            <HStack className="items-center justify-between px-4">
              <Text size="lg" className="text-foreground">
                QR 읽은 사람
              </Text>

              <HStack className="items-center gap-3">
                <HStack className="items-center">
                  {visibleParticipantNames.length > 0 ? (
                    visibleParticipantNames.map((name, index) => (
                      <Center
                        key={`${name}-${index}`}
                        className="-ml-2 h-10 w-10 rounded-full border-2 border-white bg-outline-light first:ml-0"
                        accessibilityLabel={`${name} 참여 중`}
                      >
                        <Text bold className="text-foreground">
                          {name.slice(0, 1)}
                        </Text>
                      </Center>
                    ))
                  ) : (
                    <Box
                      className="h-10 w-10 rounded-full bg-outline-light"
                      accessibilityLabel="참여자 프로필"
                    />
                  )}
                </HStack>
                <Text size="lg" bold className="min-w-10 text-right">
                  {safeParticipantCount}명
                </Text>
              </HStack>
            </HStack>

            <HStack className="gap-4">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={isStarting}
                onPress={onCancel}
                accessibilityLabel="실시간 공유 취소"
              >
                <ButtonText>취소하기</ButtonText>
              </Button>
              <Button
                variant="gradient"
                size="lg"
                className="flex-1"
                disabled={isStarting || !canStart}
                onPress={onStart}
                accessibilityLabel="실시간 공유 시작"
              >
                {isStarting && <ButtonSpinner color="#ffffff" />}
                <ButtonText>
                  {isStarting
                    ? "공유 중..."
                    : canStart
                      ? "공유하기"
                      : "카메라 준비 중"}
                </ButtonText>
              </Button>
            </HStack>
          </VStack>
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
