import { rtcViewerQuery } from "@entities/rtc";
import {
  createCameraJoinPath,
  createRtcJoinPath,
  RTC_NAVIGATION,
} from "@shared/config";
import { normalizeAuthReturnTo } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import {
  Button,
  ButtonSpinner,
  ButtonText,
  HStack,
  Input,
  Text,
  VStack,
} from "@shared/ui";
import { Href, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, TextInput } from "react-native";

const sanitizeCode = (value: string) =>
  value.replace(/\D/g, "").slice(0, 6);

interface JoinedRoom {
  joinCode: string;
  roomId: string;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "잠시 후 다시 시도해주세요.";

export interface RtcJoinFormProps {
  initialCode?: string;
  onCancel?: () => void;
  loginReturnRoute?: "camera" | "rtc-join";
}

export function RtcJoinForm({
  initialCode,
  onCancel,
  loginReturnRoute = "rtc-join",
}: RtcJoinFormProps) {
  const joinRoomMutation = rtcViewerQuery.useJoinRtcRoom();
  const viewerTokenMutation =
    rtcViewerQuery.useCreateViewerLiveKitToken();
  const isInitialized = useAuthStore(
    (state) => state.isInitialized,
  );
  const accessToken = useAuthStore(
    (state) => state.accessToken,
  );
  const [code, setCode] = useState(() =>
    sanitizeCode(initialCode ?? ""),
  );
  const [joinedRoom, setJoinedRoom] =
    useState<JoinedRoom | null>(null);
  const reusableJoinedRoom =
    joinedRoom?.joinCode === code
      ? joinedRoom
      : null;
  const isRequestPending =
    joinRoomMutation.isPending || viewerTokenMutation.isPending;
  const isSubmitting = !isInitialized || isRequestPending;
  const areInputsLocked =
    isRequestPending || Boolean(reusableJoinedRoom);

  useEffect(() => {
    if (initialCode) {
      setCode(sanitizeCode(initialCode));
    }
  }, [initialCode]);

  const handleJoin = async () => {
    if (isSubmitting) return;

    if (!accessToken) {
      const returnTo =
        loginReturnRoute === "camera"
          ? createCameraJoinPath(code)
          : createRtcJoinPath(code);

      router.replace({
        pathname: "/",
        params: {
          returnTo: normalizeAuthReturnTo(returnTo),
        },
      } as Href);
      return;
    }

    if (code.length !== 6) {
      Alert.alert("참여 코드 확인", "6자리 숫자를 입력해주세요.");
      return;
    }

    try {
      // 방 참여 요청은 중복 호출하지 않고, LiveKit 토큰 발급만 실패하면
      // 기존 roomId로 해당 단계만 다시 시도합니다.
      let room = reusableJoinedRoom;

      if (!room) {
        const response = await joinRoomMutation.mutateAsync({
          code,
        });
        room = {
          joinCode: code,
          roomId: response.roomId,
        };
        setJoinedRoom(room);
      }

      await viewerTokenMutation.mutateAsync({
        roomId: room.roomId,
      });
      router.replace(RTC_NAVIGATION.paths.viewer as Href);
    } catch (error) {
      Alert.alert("RTC 방 참여 실패", getErrorMessage(error));
    }
  };

  return (
    <VStack className="gap-7">
      <VStack className="gap-2">
        <Text size="2xl" bold>
          실시간 공유 참여
        </Text>
        <Text className="text-outline">
          호스트 화면에 표시된 6자리 코드를 입력해주세요.
        </Text>
      </VStack>

      <VStack className="gap-2">
        <Text bold>공유 코드</Text>
        <Input className="min-h-14">
          <TextInput
            value={code}
            onChangeText={(value) =>
              setCode(sanitizeCode(value))
            }
            placeholder="6자리 숫자"
            keyboardType="number-pad"
            maxLength={6}
            editable={!areInputsLocked}
            textContentType="oneTimeCode"
            returnKeyType="join"
            onSubmitEditing={() => void handleJoin()}
            className="h-full flex-1 text-center text-xl tracking-widest text-foreground"
            accessibilityLabel="6자리 공유 코드"
          />
        </Input>
      </VStack>

      <HStack className="gap-3">
        {onCancel ? (
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={isRequestPending}
            onPress={onCancel}
          >
            <ButtonText>취소하기</ButtonText>
          </Button>
        ) : null}
        <Button
          variant="gradient"
          size="lg"
          className="flex-1"
          disabled={isSubmitting}
          onPress={() => void handleJoin()}
        >
          {isSubmitting ? (
            <ButtonSpinner color="white" />
          ) : null}
          <ButtonText>
            {!isInitialized
              ? "세션 확인 중..."
              : isRequestPending
                ? "연결 중..."
                : reusableJoinedRoom
                  ? "연결 다시 시도"
                  : accessToken
                    ? "참여하기"
                    : "로그인 후 참여"}
          </ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}
