import {
  mergeRtcRoomEvent,
  rtcRoomQuery,
  RtcRoomResponse,
  RtcRoomResponseSchema,
  type RtcRoomEvent,
} from "@entities/rtc-room";
import type {
  RtcLiveKitConnection,
  RtcViewerSession,
} from "@entities/rtc-session";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isRtcViewerEntryCallbackCurrent,
  resolveRtcViewerRoomSignal,
} from "./rtc-viewer-entry";
import { rtcViewerQuery } from "../api";

export type RtcViewerEntryPhase =
  | "IDLE"
  | "WAITING_FOR_LIVE"
  | "REQUESTING_TOKEN"
  | "TOKEN_ERROR"
  | "READY"
  | "ROOM_ENDED";

export type RtcViewerEntryStreamState =
  "IDLE" | "CONNECTING" | "OPEN" | "RECONNECTING" | "ENDED";

interface UseRtcViewerEntryOptions {
  enabled: boolean;
  session: RtcViewerSession | null;
}

export interface RtcViewerEntryResult {
  phase: RtcViewerEntryPhase;
  streamState: RtcViewerEntryStreamState;
  room: RtcRoomResponse | null;
  connection: RtcLiveKitConnection | null;
  tokenErrorMessage: string | null;
  retryToken: () => void;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "실시간 공유 연결 정보를 불러오지 못했습니다.";

function waitForReconnect(delayMs: number, signal: AbortSignal): Promise<void> {
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
}: UseRtcViewerEntryOptions): RtcViewerEntryResult {
  const viewerTokenMutation = rtcViewerQuery.useCreateViewerLiveKitToken();
  const createViewerToken = viewerTokenMutation.mutateAsync;
  const resetViewerToken = viewerTokenMutation.reset;
  const [phase, setPhase] = useState<RtcViewerEntryPhase>("IDLE");
  const [streamState, setStreamState] =
    useState<RtcViewerEntryStreamState>("IDLE");

  const [room, setRoom] = useState<RtcRoomResponse | null>(null);
  const [connection, setConnection] = useState<RtcLiveKitConnection | null>(
    null,
  );

  const [tokenErrorMessage, setTokenErrorMessage] = useState<string | null>(
    null,
  );
  const sessionKey = session
    ? `${session.roomId.trim()}:${session.participantId.trim()}`
    : "";
  const sessionKeyRef = useRef(sessionKey);
  const entryEpochRef = useRef(0);
  const latestRoomSignalRef = useRef<"LIVE" | null>(null);
  const tokenAttemptedRef = useRef(false);
  const tokenPendingRef = useRef(false);
  const roomEndedRef = useRef(false);

  useEffect(() => {
    entryEpochRef.current += 1;
    sessionKeyRef.current = sessionKey;
    latestRoomSignalRef.current = null;
    tokenAttemptedRef.current = false;
    tokenPendingRef.current = false;
    roomEndedRef.current = false;
    setConnection(null);
    setTokenErrorMessage(null);
    setPhase(enabled && session ? "WAITING_FOR_LIVE" : "IDLE");
    setStreamState(enabled && session ? "CONNECTING" : "IDLE");
  }, [enabled, sessionKey]);

  useEffect(() => {
    setRoom(null);
  }, [sessionKey]);

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
    const requestEntryEpoch = entryEpochRef.current;
    tokenAttemptedRef.current = true;
    tokenPendingRef.current = true;
    setTokenErrorMessage(null);
    setPhase("REQUESTING_TOKEN");

    void createViewerToken({
      roomId: session.roomId,
      participantId: session.participantId,
    })
      .then((response) => {
        if (
          sessionKeyRef.current === requestSessionKey &&
          entryEpochRef.current === requestEntryEpoch &&
          !roomEndedRef.current
        ) {
          setConnection({
            url: response.url,
            token: response.token,
          });
          setPhase("READY");
        }
      })
      .catch((error: unknown) => {
        if (
          sessionKeyRef.current === requestSessionKey &&
          entryEpochRef.current === requestEntryEpoch &&
          !roomEndedRef.current
        ) {
          setTokenErrorMessage(getErrorMessage(error));
          setPhase("TOKEN_ERROR");
        }
      })
      .finally(() => {
        if (
          sessionKeyRef.current === requestSessionKey &&
          entryEpochRef.current === requestEntryEpoch
        ) {
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
    const callbackEntryEpoch = entryEpochRef.current;
    let isMounted = true;
    let isTerminal = false;

    const handleEvent = (
      event: RtcRoomEvent,
      streamController: AbortController,
    ) => {
      if (
        !isRtcViewerEntryCallbackCurrent({
          currentEpoch: entryEpochRef.current,
          callbackEpoch: callbackEntryEpoch,
          isMounted,
        })
      ) {
        return;
      }

      if (event.type !== "heartbeat" && event.payload.roomId !== roomId) {
        return;
      }

      if (event.type === "snapshot") {
        const parsedRoom = RtcRoomResponseSchema.safeParse(event.payload);

        if (parsedRoom.success && isMounted) {
          setRoom(parsedRoom.data);
        }
      } else if (event.type !== "heartbeat" && isMounted) {
        setRoom((currentRoom) => {
          if (!currentRoom) return currentRoom;

          return mergeRtcRoomEvent(currentRoom, event) ?? currentRoom;
        });
      }

      const signal = resolveRtcViewerRoomSignal(event);
      if (signal === "ENDED") {
        isTerminal = true;
        roomEndedRef.current = true;
        latestRoomSignalRef.current = null;
        if (isMounted) {
          setConnection(null);
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

      while (!lifecycleController.signal.aborted && !isTerminal) {
        const streamController = new AbortController();
        const abortStream = () => streamController.abort();
        lifecycleController.signal.addEventListener("abort", abortStream, {
          once: true,
        });

        if (isMounted) {
          setStreamState(retryAttempt === 0 ? "CONNECTING" : "RECONNECTING");
        }

        try {
          await rtcRoomQuery.subscribeRtcRoomEvents({
            roomId,
            signal: streamController.signal,
            onOpen: () => {
              retryAttempt = 0;
              if (
                isRtcViewerEntryCallbackCurrent({
                  currentEpoch: entryEpochRef.current,
                  callbackEpoch: callbackEntryEpoch,
                  isMounted,
                })
              ) {
                setStreamState("OPEN");
              }
            },
            onEvent: (event) => handleEvent(event, streamController),
          });
        } catch {
          if (isMounted && !lifecycleController.signal.aborted && !isTerminal) {
            setStreamState("RECONNECTING");
          }
        } finally {
          lifecycleController.signal.removeEventListener("abort", abortStream);
        }

        if (lifecycleController.signal.aborted || isTerminal) {
          break;
        }

        const reconnectDelayMs = Math.min(1_000 * 2 ** retryAttempt, 15_000);
        await waitForReconnect(reconnectDelayMs, lifecycleController.signal);
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
    room,
    connection,
    tokenErrorMessage,
    retryToken,
  };
}
