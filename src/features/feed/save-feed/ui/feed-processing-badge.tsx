import { deleteStagedUploadFile } from "@shared/lib";
import { Pressable, Text } from "@shared/ui";
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FEED_PROCESSING_CONFIG } from "../config/feed-processing-config";
import { triggerFeedCompletionHaptic } from "../lib/feed-processing-haptics";
import {
  claimFeedCompletionHaptic,
  getProcessingCompletionHapticKey,
  getPublishingCompletionHapticKey,
} from "../model/feed-completion-haptic";
import { useFeedProcessingStore } from "../model/feed-processing-store";
import { useFeedPublishingStore } from "../model/feed-publishing-store";
import { useFeedProcessingDisplayProgress } from "../model/use-feed-processing-display-progress";

function getPublishingBadgeLabel(
  kind: "CREATE" | "UPDATE",
  phase: "queued" | "uploading" | "updating" | "completed" | "failed",
  errorMessage?: string,
) {
  const action = kind === "CREATE" ? "게시" : "수정";
  if (phase === "failed") {
    return errorMessage
      ? `${action} 실패 · ${errorMessage}`
      : `${action} 실패 · 눌러서 다시 시도`;
  }
  if (phase === "completed") return `피드 ${action} 완료`;
  if (phase === "queued") return `피드 ${action} 준비 중`;
  return kind === "CREATE" ? "피드 업로드 중" : "피드 수정 중";
}

function getBadgeLabel(
  phase: "processing" | "completed" | "failed",
  progressPercent: number,
  transportState: string,
  listRefreshState: string,
) {
  if (phase === "failed") return "피드 처리 실패";
  if (phase === "completed") {
    if (listRefreshState === "pending") return "게시 완료 · 목록 갱신 중";
    if (listRefreshState === "failed") {
      return "게시 완료 · 목록 새로고침 필요";
    }
    return "피드 게시 완료";
  }
  if (transportState === "polling" || transportState === "disconnected") {
    return `피드 처리 상태 확인 중 · ${Math.round(progressPercent)}%`;
  }
  return `피드 처리 중 · ${Math.round(progressPercent)}%`;
}

export function FeedProcessingBadge() {
  const insets = useSafeAreaInsets();
  const handledHapticKeysRef = useRef(new Set<string>());
  const publishingTask = useFeedPublishingStore((state) => state.task);
  const retryPublishing = useFeedPublishingStore((state) => state.retry);
  const dismissPublishing = useFeedPublishingStore((state) => state.dismiss);
  const job = useFeedProcessingStore((state) => state.job);
  const dismiss = useFeedProcessingStore((state) => state.dismiss);
  const displayProgressPercent = useFeedProcessingDisplayProgress(job);
  const completionHapticKey =
    getPublishingCompletionHapticKey(publishingTask) ??
    getProcessingCompletionHapticKey(job);

  useEffect(() => {
    const shouldTrigger = claimFeedCompletionHaptic(
      handledHapticKeysRef.current,
      completionHapticKey,
      AppState.currentState === "active",
    );
    if (shouldTrigger) void triggerFeedCompletionHaptic();
  }, [completionHapticKey]);

  useEffect(() => {
    if (job?.phase !== "completed" || job.listRefreshState !== "succeeded") {
      return;
    }

    const timeout = setTimeout(
      dismiss,
      FEED_PROCESSING_CONFIG.completedBadgeDurationMs,
    );
    return () => clearTimeout(timeout);
  }, [dismiss, job?.jobId, job?.listRefreshState, job?.phase]);

  useEffect(() => {
    if (publishingTask?.phase !== "completed") return;

    const taskId = publishingTask.id;
    const timeout = setTimeout(
      () => dismissPublishing(taskId),
      FEED_PROCESSING_CONFIG.completedBadgeDurationMs,
    );
    return () => clearTimeout(timeout);
  }, [dismissPublishing, publishingTask?.id, publishingTask?.phase]);

  if (publishingTask) {
    const isFailed = publishingTask.phase === "failed";
    const isCompleted = publishingTask.phase === "completed";

    const handleDismiss = () => {
      if (publishingTask.command.kind === "CREATE") {
        deleteStagedUploadFile(publishingTask.command.image);
      }
      dismissPublishing(publishingTask.id);
    };

    return (
      <View
        pointerEvents="box-none"
        className="absolute left-4 right-4 z-[100] items-end"
        style={{ top: insets.top + 8, elevation: 100 }}
      >
        <View
          className={`min-h-11 max-w-[84%] flex-row items-center rounded-[1.375rem] px-4 shadow-hard-2 ${
            isFailed ? "bg-[#423b3b]" : "bg-brand"
          }`}
        >
          <Pressable
            accessibilityLabel={
              isFailed ? "실패한 피드 저장 다시 시도" : "피드로 이동"
            }
            className="flex-row items-center gap-2 flex-shrink"
            onPress={() => {
              if (isFailed) {
                retryPublishing(publishingTask.id);
              } else {
                router.push("/feed");
              }
            }}
          >
            {isFailed ? (
              <IconAlertCircle color="white" size={19} />
            ) : isCompleted ? (
              <IconCheck color="white" size={19} />
            ) : (
              <ActivityIndicator color="white" size="small" />
            )}
            <Text
              className="text-white font-semibold flex-shrink"
              size="sm"
              numberOfLines={2}
            >
              {getPublishingBadgeLabel(
                publishingTask.command.kind,
                publishingTask.phase,
                publishingTask.errorMessage,
              )}
            </Text>
          </Pressable>
          {isFailed || isCompleted ? (
            <Pressable
              accessibilityLabel="피드 게시 상태 닫기"
              className="ml-2"
              onPress={handleDismiss}
            >
              <IconX color="white" size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  if (!job) return null;

  const isFailed = job.phase === "failed" || job.listRefreshState === "failed";
  const isCompleted =
    job.phase === "completed" && job.listRefreshState === "succeeded";

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-4 right-4 z-[100] items-end"
      style={{ top: insets.top + 8, elevation: 100 }}
    >
      <View
        className={`min-h-11 max-w-[84%] flex-row items-center rounded-[1.375rem] px-4 shadow-hard-2 ${
          isFailed ? "bg-[#423b3b]" : "bg-brand"
        }`}
      >
        <Pressable
          className="z-[1] flex-shrink flex-row items-center gap-2"
          onPress={() => router.push("/feed")}
        >
          {isFailed ? (
            <IconAlertCircle color="white" size={19} />
          ) : isCompleted ? (
            <IconCheck color="white" size={19} />
          ) : null}
          <Text
            className="text-white font-semibold flex-shrink"
            size="sm"
            numberOfLines={1}
          >
            {getBadgeLabel(
              job.phase,
              displayProgressPercent,
              job.transportState,
              job.listRefreshState,
            )}
          </Text>
          {job.phase === "processing" ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(displayProgressPercent),
              }}
              pointerEvents="none"
              className="h-1 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-white/35"
            >
              <View
                className="h-full rounded-sm bg-white"
                style={{ width: `${displayProgressPercent}%` }}
              />
            </View>
          ) : null}
        </Pressable>
        {job.phase !== "processing" ? (
          <Pressable
            accessibilityLabel="피드 처리 상태 닫기"
            className="z-[1] ml-2"
            onPress={dismiss}
          >
            <IconX color="white" size={18} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
