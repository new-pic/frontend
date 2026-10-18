import { getApiErrorMessage } from "@shared/api";
import {
  createCameraJoinPath,
  createRtcJoinPath,
  RTC_NAVIGATION,
} from "@shared/config";
import { normalizeAuthReturnTo } from "@shared/lib";
import { useAppTranslation } from "@shared/lib";
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
import { rtcViewerQuery } from "../api";

const sanitizeCode = (value: string) => value.replace(/\D/g, "").slice(0, 6);

export interface RtcJoinFormProps {
  initialCode?: string;
  onCancel?: () => void;
  loginReturnRoute?: "camera" | "rtc-join";
  showHeader?: boolean;
}

export function RtcJoinFormHeader() {
  const { t } = useAppTranslation();

  return (
    <VStack className="gap-3">
      <Text size="xl" bold>
        {t("rtc.join.title")}
      </Text>
      <Text className="text-label-muted">{t("rtc.join.description")}</Text>
    </VStack>
  );
}

export function RtcJoinForm({
  initialCode,
  onCancel,
  loginReturnRoute = "rtc-join",
  showHeader = true,
}: RtcJoinFormProps) {
  const { t } = useAppTranslation();
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
      Alert.alert(
        t("rtc.join.codeCheckTitle"),
        t("rtc.join.codeCheckDescription"),
      );
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
        t("rtc.join.failedTitle"),
        getApiErrorMessage(error, t("rtc.join.failedDescription")),
      );
    } finally {
      joinLockRef.current = false;
    }
  };

  return (
    <VStack className="gap-6">
      {showHeader ? <RtcJoinFormHeader /> : null}

      <VStack className="gap-3">
        <Text bold>{t("rtc.join.codeLabel")}</Text>
        <Input className="h-14 rounded-xl">
          <InputField
            value={code}
            onChangeText={(value) => setCode(sanitizeCode(value))}
            placeholder={t("rtc.join.codePlaceholder")}
            keyboardType="number-pad"
            maxLength={6}
            editable={!isRequestPending}
            textContentType="oneTimeCode"
            returnKeyType="join"
            onSubmitEditing={() => void handleJoin()}
            className="text-center text-xl"
            style={{ letterSpacing: code.length > 0 ? 4 : 0 }}
            accessibilityLabel={t("rtc.join.codeAccessibility")}
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
            <ButtonText>{t("rtc.join.cancel")}</ButtonText>
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
              ? t("rtc.join.checking")
              : isRequestPending
                ? t("rtc.join.joining")
                : accessToken
                  ? t("rtc.join.join")
                  : t("rtc.join.signInToJoin")}
          </ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}
