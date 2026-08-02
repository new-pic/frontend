import {
  rtcQuery,
  rtcViewerQuery,
  type RtcRoomEvent,
  type RtcViewerSession,
} from "@entities/rtc";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveRtcViewerRoomSignal } from "./rtc-viewer-entry";

export type RtcViewerEntryPhase =
  | "IDLE"
  | "WAITING_FOR_LIVE"
  | "REQUESTING_TOKEN"
  | "TOKEN_ERROR"
  | "READY"
  | "ROOM_ENDED";

export type RtcViewerEntryStreamState =
  | "IDLE"
  | "CONNECTING"
  | "OPEN"
  | "RECONNECTING"
  | "ENDED";

interface UseRtcViewerEntryOptions {
  enabled: boolean;
  session: RtcViewerSession | null;
}

interface UseRtcViewerEntryResult {
  phase: RtcViewerEntryPhase;
  streamState: RtcViewerEntryStreamState;
  hostNickname?: string;
  tokenErrorMessage: string | null;
  retryToken: () => void;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "실시간 공유 연결 정보를 불러오지 못했습니다.";

function waitForReconnect(
  delayMs: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(resolve, delayMs);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        resolve();
      },
      { once: true },
    );
  });
}

export function useRtcViewerEntry({
  enabled,
  session,
}: UseRtcViewerEntryOptions): UseRtcViewerEntryResult {
  const viewerTokenMutation =
    rtcViewerQuery.useCreateViewerLiveKitToken();
  const createViewerToken = viewerTokenMutation.mutateAsync;
  const resetViewerToken = viewerTokenMutation.reset;
  const [phase, setPhase] =
    useState<RtcViewerEntryPhase>("IDLE");
  const [streamState, setStreamState] =
    useState<RtcViewerEntryStreamState>("IDLE");
  const [hostNickname, setHostNickname] = useState<
    string | undefined
  >();
  const [tokenErrorMessage, setTokenErrorMessage] = useState<
    string | null
  >(null);
  const sessionKey = session
    ? `${session.roomId.trim()}:${session.participantId.trim()}`
    : "";
  const sessionKeyRef = useRef(sessionKey);
  const latestRoomSignalRef = useRef<"LIVE" | null>(null);
  const tokenAttemptedRef = useRef(false);
  const tokenPendingRef = useRef(false);
  const roomEndedRef = useRef(false);

  useEffect(() => {
    sessionKeyRef.current = sessionKey;
    latestRoomSignalRef.current = null;
    tokenAttemptedRef.current = false;
    tokenPendingRef.current = false;
    roomEndedRef.current = false;
    setHostNickname(undefined);
    setTokenErrorMessage(null);
    setPhase(enabled && session ? "WAITING_FOR_LIVE" : "IDLE");
    setStreamState(enabled && session ? "CONNECTING" : "IDLE");
  }, [enabled, sessionKey]);

  const requestLiveKitToken = useCallback(() => {
    if (
      !enabled ||
      !session ||
      latestRoomSignalRef.current !== "LIVE" ||
      tokenAttemptedRef.current ||
      tokenPendingRef.current ||
      roomEndedRef.current
    ) {
      return;
    }

    const requestSessionKey = sessionKey;
    tokenAttemptedRef.current = true;
    tokenPendingRef.current = true;
    setTokenErrorMessage(null);
    setPhase("REQUESTING_TOKEN");

    void createViewerToken({
      roomId: session.roomId,
      participantId: session.participantId,
    })
      .then(() => {
        if (
          sessionKeyRef.current === requestSessionKey &&
          !roomEndedRef.current
        ) {
          setPhase("READY");
        }
      })
      .catch((error: unknown) => {
        if (
          sessionKeyRef.current === requestSessionKey &&
          !roomEndedRef.current
        ) {
          setTokenErrorMessage(getErrorMessage(error));
          setPhase("TOKEN_ERROR");
        }
      })
      .finally(() => {
        if (sessionKeyRef.current === requestSessionKey) {
          tokenPendingRef.current = false;
        }
      });
  }, [createViewerToken, enabled, session, sessionKey]);

  const retryToken = useCallback(() => {
    if (
      phase !== "TOKEN_ERROR" ||
      latestRoomSignalRef.current !== "LIVE" ||
      roomEndedRef.current
    ) {
      return;
    }

    tokenAttemptedRef.current = false;
    resetViewerToken();
    requestLiveKitToken();
  }, [phase, requestLiveKitToken, resetViewerToken]);

  useEffect(() => {
    const roomId = session?.roomId.trim() ?? "";
    if (!enabled || !roomId) return;

    const lifecycleController = new AbortController();
    let isMounted = true;
    let isTerminal = false;

    const handleEvent = (
      event: RtcRoomEvent,
      streamController: AbortController,
    ) => {
      if (
        event.type !== "heartbeat" &&
        event.payload.roomId !== roomId
      ) {
        return;
      }

      if (event.type !== "heartbeat") {
        const nickname = event.payload.host?.nickname.trim();
        if (nickname && isMounted) setHostNickname(nickname);
      }

      const signal = resolveRtcViewerRoomSignal(event);
      if (signal === "ENDED") {
        isTerminal = true;
        roomEndedRef.current = true;
        latestRoomSignalRef.current = null;
        if (isMounted) {
          setPhase("ROOM_ENDED");
          setStreamState("ENDED");
        }
        streamController.abort();
        return;
      }

      if (signal === "LIVE") {
        latestRoomSignalRef.current = "LIVE";
        requestLiveKitToken();
      }
    };

    const run = async () => {
      let retryAttempt = 0;

      while (
        !lifecycleController.signal.aborted &&
        !isTerminal
      ) {
        const streamController = new AbortController();
        const abortStream = () => streamController.abort();
        lifecycleController.signal.addEventListener(
          "abort",
          abortStream,
          { once: true },
        );

        if (isMounted) {
          setStreamState(
            retryAttempt === 0 ? "CONNECTING" : "RECONNECTING",
          );
        }

        try {
          await rtcQuery.subscribeRtcRoomEvents({
            roomId,
            signal: streamController.signal,
            onOpen: () => {
              if (isMounted) setStreamState("OPEN");
            },
            onEvent: (event) =>
              handleEvent(event, streamController),
          });
        } catch {
          if (
            isMounted &&
            !lifecycleController.signal.aborted &&
            !isTerminal
          ) {
            setStreamState("RECONNECTING");
          }
        } finally {
          lifecycleController.signal.removeEventListener(
            "abort",
            abortStream,
          );
        }

        if (
          lifecycleController.signal.aborted ||
          isTerminal
        ) {
          break;
        }

        const reconnectDelayMs = Math.min(
          1_000 * 2 ** retryAttempt,
          15_000,
        );
        await waitForReconnect(
          reconnectDelayMs,
          lifecycleController.signal,
        );
        retryAttempt += 1;
      }
    };

    void run();

    return () => {
      isMounted = false;
      lifecycleController.abort();
    };
  }, [enabled, requestLiveKitToken, session?.roomId]);

  return {
    phase,
    streamState,
    hostNickname,
    tokenErrorMessage,
    retryToken,
  };
}
