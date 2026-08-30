import {
  mergeRtcRoomEvent,
  rtcQuery,
  rtcQueryKeys,
  type RtcRoomResponse,
} from "@entities/rtc";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getRtcRoomReconnectDelay } from "./rtc-host-control";

export type RtcRoomStreamState =
  "IDLE" | "CONNECTING" | "OPEN" | "RECONNECTING" | "ENDED";

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

export function useRtcRoomEvents({
  enabled,
  roomId,
}: {
  enabled: boolean;
  roomId: string;
}) {
  const queryClient = useQueryClient();
  const [streamState, setStreamState] = useState<RtcRoomStreamState>("IDLE");

  useEffect(() => {
    const normalizedRoomId = roomId.trim();
    if (!enabled || !normalizedRoomId) {
      setStreamState("IDLE");
      return;
    }

    const lifecycleController = new AbortController();
    let isMounted = true;
    let isTerminal = false;

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
          await rtcQuery.subscribeRtcRoomEvents({
            roomId: normalizedRoomId,
            signal: streamController.signal,
            onOpen: () => {
              if (isMounted) setStreamState("OPEN");
            },
            onEvent: (event) => {
              if (event.type === "ended") {
                isTerminal = true;
              }

              queryClient.setQueryData<RtcRoomResponse>(
                rtcQueryKeys.hostRoom(normalizedRoomId),
                (room) => mergeRtcRoomEvent(room, event),
              );
            },
          });
        } catch {
          if (!lifecycleController.signal.aborted) {
            void queryClient.invalidateQueries({
              queryKey: rtcQueryKeys.hostRoom(normalizedRoomId),
            });
          }
        } finally {
          lifecycleController.signal.removeEventListener("abort", abortStream);
        }

        if (lifecycleController.signal.aborted || isTerminal) {
          break;
        }

        await waitForReconnect(
          getRtcRoomReconnectDelay(retryAttempt),
          lifecycleController.signal,
        );
        retryAttempt += 1;
      }

      if (isMounted && isTerminal) {
        setStreamState("ENDED");
      }
    };

    void run();

    return () => {
      isMounted = false;
      lifecycleController.abort();
    };
  }, [enabled, queryClient, roomId]);

  return streamState;
}
