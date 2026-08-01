import { colors } from "@shared/constants";
import { deleteStagedUploadFile } from "@shared/lib";
import { Pressable, Text } from "@shared/ui";
import {
  IconAlertCircle,
  IconCheck,
  IconLoader2,
  IconX,
} from "@tabler/icons-react-native";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, StyleSheet, View } from "react-native";
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
import {
  useFeedProcessingDisplayProgress,
} from "../model/use-feed-processing-display-progress";

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
  if (
    transportState === "polling" ||
    transportState === "disconnected"
  ) {
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
    if (
      job?.phase !== "completed" ||
      job.listRefreshState !== "succeeded"
    ) {
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
    const Icon = isFailed
      ? IconAlertCircle
      : isCompleted
        ? IconCheck
        : IconLoader2;

    const handleDismiss = () => {
      if (publishingTask.command.kind === "CREATE") {
        deleteStagedUploadFile(publishingTask.command.image);
      }
      dismissPublishing(publishingTask.id);
    };

    return (
      <View
        pointerEvents="box-none"
        style={[styles.layer, { top: insets.top + 8 }]}
      >
        <View style={[styles.badge, isFailed && styles.failedBadge]}>
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
            <Icon color="white" size={19} />
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

  const isFailed =
    job.phase === "failed" || job.listRefreshState === "failed";
  const isCompleted =
    job.phase === "completed" &&
    job.listRefreshState === "succeeded";
  const Icon = isFailed
    ? IconAlertCircle
    : isCompleted
      ? IconCheck
      : IconLoader2;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { top: insets.top + 8 }]}
    >
      <View
        style={[
          styles.badge,
          job.phase === "processing" && styles.processingBadge,
          isFailed && styles.failedBadge,
        ]}
      >
        {job.phase === "processing" ? (
          <View
            pointerEvents="none"
            style={[
              styles.progressFill,
              {
                width: `${displayProgressPercent}%`,
              },
            ]}
          />
        ) : null}
        <Pressable
          className="flex-row items-center gap-2"
          style={styles.badgeContent}
          onPress={() => router.push("/feed")}
        >
          <Icon color="white" size={19} />
          <Text className="text-white font-semibold" size="sm">
            {getBadgeLabel(
              job.phase,
              displayProgressPercent,
              job.transportState,
              job.listRefreshState,
            )}
          </Text>
        </Pressable>
        {job.phase !== "processing" ? (
          <Pressable
            accessibilityLabel="피드 처리 상태 닫기"
            className="ml-2"
            style={styles.badgeContent}
            onPress={dismiss}
          >
            <IconX color="white" size={18} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 100,
    elevation: 100,
  },
  badge: {
    minHeight: 44,
    maxWidth: "100%",
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand.primary,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  failedBadge: {
    backgroundColor: "#423b3b",
  },
  processingBadge: {
    backgroundColor: "#423b3b",
  },
  progressFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 22,
    backgroundColor: colors.brand.primary,
  },
  badgeContent: {
    zIndex: 1,
  },
});
