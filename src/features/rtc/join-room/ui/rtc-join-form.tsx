import { rtcViewerQuery } from "@entities/rtc";
import { getApiErrorMessage } from "@shared/api";
import {
  createCameraJoinPath,
  createRtcJoinPath,
  RTC_NAVIGATION,
} from "@shared/config";
import { normalizeAuthReturnTo } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import {
  Button,
  ButtonText,
  HStack,
  Input,
  InputField,
  Text,
  VStack,
} from "@shared/ui";
import { Href, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

const sanitizeCode = (value: string) => value.replace(/\D/g, "").slice(0, 6);

export interface RtcJoinFormProps {
  initialCode?: string;
  onCancel?: () => void;
  loginReturnRoute?: "camera" | "rtc-join";
  showHeader?: boolean;
}

export function RtcJoinFormHeader() {
  return (
    <VStack className="gap-3">
      <Text size="xl" bold>
        실시간 공유 참여
      </Text>
      <Text className="text-label-muted">
        호스트 화면에 표시된 6자리 코드를 입력해주세요.
      </Text>
    </VStack>
  );
}

export function RtcJoinForm({
  initialCode,
  onCancel,
  loginReturnRoute = "rtc-join",
  showHeader = true,
}: RtcJoinFormProps) {
  const joinRoomMutation = rtcViewerQuery.useJoinRtcRoom();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [code, setCode] = useState(() => sanitizeCode(initialCode ?? ""));
  const isRequestPending = joinRoomMutation.isPending;
  const isSubmitting = !isInitialized || isRequestPending;
  const joinLockRef = useRef(false);

  useEffect(() => {
    if (initialCode) {
      setCode(sanitizeCode(initialCode));
    }
  }, [initialCode]);

  const handleJoin = async () => {
    if (isSubmitting || joinLockRef.current) {
      return;
    }

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

    joinLockRef.current = true;

    try {
      await joinRoomMutation.mutateAsync({
        code,
      });
      router.replace(RTC_NAVIGATION.paths.viewer as Href);
    } catch (error) {
      Alert.alert(
        "RTC 방 참여 실패",
        getApiErrorMessage(
          error,
          "방에 참여하지 못했습니다. 코드를 확인하고 다시 시도해주세요.",
        ),
      );
    } finally {
      joinLockRef.current = false;
    }
  };

  return (
    <VStack className="gap-6">
      {showHeader ? <RtcJoinFormHeader /> : null}

      <VStack className="gap-3">
        <Text bold>공유 코드</Text>
        <Input className="h-14 rounded-xl">
          <InputField
            value={code}
            onChangeText={(value) => setCode(sanitizeCode(value))}
            placeholder="6자리 숫자"
            keyboardType="number-pad"
            maxLength={6}
            editable={!isRequestPending}
            textContentType="oneTimeCode"
            returnKeyType="join"
            onSubmitEditing={() => void handleJoin()}
            className="text-center text-xl"
            style={{ letterSpacing: code.length > 0 ? 4 : 0 }}
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
          isLoading={isSubmitting}
          onPress={() => void handleJoin()}
        >
          <ButtonText>
            {!isInitialized
              ? "세션 확인 중..."
              : isRequestPending
                ? "참여 중..."
                : accessToken
                  ? "참여하기"
                  : "로그인 후 참여"}
          </ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}
