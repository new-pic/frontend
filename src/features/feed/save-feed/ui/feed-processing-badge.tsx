import { deleteStagedUploadFile, useAppTranslation } from "@shared/lib";
import { Pressable, Text } from "@shared/ui";
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TFunction } from "i18next";
import { FEED_PROCESSING_CONFIG } from "../config/feed-processing-config";
import { triggerFeedCompletionHaptic } from "../lib/feed-processing-haptics";
import {
  claimFeedCompletionHaptic,
  getProcessingCompletionHapticKey,
  getPublishingCompletionHapticKey,
} from "../model/pipeline/feed-completion-haptic";
import { useFeedProcessingDisplayProgress } from "../model/processing/use-feed-processing-display-progress";
import { useFeedProcessingStore } from "../model/processing/feed-processing-store";
import { useFeedPublishingStore } from "../model/publishing/feed-publishing-store";

function getPublishingBadgeLabel(
  t: TFunction<"translation">,
  kind: "CREATE" | "UPDATE",
  phase: "queued" | "uploading" | "updating" | "completed" | "failed",
  failureMessage?: string,
) {
  const action =
    kind === "CREATE"
      ? t("feed.publishing.publishNoun")
      : t("feed.publishing.updateNoun");
  if (phase === "failed") {
    return failureMessage
      ? t("feed.publishing.failedBadge", {
          action,
          message: failureMessage,
        })
      : t("feed.publishing.retryBadge", { action });
  }
  if (phase === "completed") {
    return t("feed.publishing.completedBadge", { action });
  }
  if (phase === "queued") {
    return t("feed.publishing.queuedBadge", { action });
  }
  return kind === "CREATE"
    ? t("feed.publishing.uploading")
    : t("feed.publishing.updating");
}

function getBadgeLabel(
  t: TFunction<"translation">,
  phase: "processing" | "completed" | "failed",
  progressPercent: number,
  monitoringState: string,
  feedListSyncState: string,
) {
  if (phase === "failed") return t("feed.publishing.processingFailed");
  if (phase === "completed") {
    if (feedListSyncState === "pending") {
      return t("feed.publishing.listRefreshing");
    }
    if (feedListSyncState === "failed") {
      return t("feed.publishing.listRefreshRequired");
    }
    return t("feed.publishing.publishCompleted");
  }
  if (monitoringState === "polling" || monitoringState === "disconnected") {
    return t("feed.publishing.checkingStatus", {
      progress: Math.round(progressPercent),
    });
  }
  return t("feed.publishing.processing", {
    progress: Math.round(progressPercent),
  });
}

export function FeedProcessingBadge() {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const handledHapticKeysRef = useRef(new Set<string>());
  const publishingTask = useFeedPublishingStore(
    (state) => state.publishingTask,
  );
  const retryPublishing = useFeedPublishingStore(
    (state) => state.retryPublishing,
  );
  const dismissPublishing = useFeedPublishingStore(
    (state) => state.dismissPublishing,
  );
  const processingLifecycle = useFeedProcessingStore(
    (state) => state.processingLifecycle,
  );
  const dismissProcessing = useFeedProcessingStore(
    (state) => state.dismissProcessing,
  );
  const displayProgressPercent =
    useFeedProcessingDisplayProgress(processingLifecycle);
  const completionHapticKey =
    getPublishingCompletionHapticKey(publishingTask) ??
    getProcessingCompletionHapticKey(processingLifecycle);

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
      processingLifecycle?.processingPhase !== "completed" ||
      processingLifecycle.feedListSyncState !== "succeeded"
    ) {
      return;
    }

    const timeout = setTimeout(
      dismissProcessing,
      FEED_PROCESSING_CONFIG.completedBadgeDurationMs,
    );
    return () => clearTimeout(timeout);
  }, [
    dismissProcessing,
    processingLifecycle?.feedListSyncState,
    processingLifecycle?.jobId,
    processingLifecycle?.processingPhase,
  ]);

  useEffect(() => {
    if (publishingTask?.publishingPhase !== "completed") return;

    const publishingTaskId = publishingTask.publishingTaskId;
    const timeout = setTimeout(
      () => dismissPublishing(publishingTaskId),
      FEED_PROCESSING_CONFIG.completedBadgeDurationMs,
    );
    return () => clearTimeout(timeout);
  }, [
    dismissPublishing,
    publishingTask?.publishingPhase,
    publishingTask?.publishingTaskId,
  ]);

  if (publishingTask) {
    const isFailed = publishingTask.publishingPhase === "failed";
    const isCompleted = publishingTask.publishingPhase === "completed";

    const handleDismiss = () => {
      if (publishingTask.command.kind === "CREATE") {
        deleteStagedUploadFile(publishingTask.command.image);
      }
      dismissPublishing(publishingTask.publishingTaskId);
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
              isFailed
                ? t("feed.publishing.retryAccessibility")
                : t("feed.publishing.goToFeedAccessibility")
            }
            className="flex-row items-center gap-2 shrink"
            onPress={() => {
              if (isFailed) {
                retryPublishing(publishingTask.publishingTaskId);
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
              className="shrink font-paperlogy-semibold text-white"
              size="sm"
              numberOfLines={2}
            >
              {getPublishingBadgeLabel(
                t,
                publishingTask.command.kind,
                publishingTask.publishingPhase,
                publishingTask.failureMessage,
              )}
            </Text>
          </Pressable>
          {isFailed || isCompleted ? (
            <Pressable
              accessibilityLabel={t(
                "feed.publishing.closePublishingAccessibility",
              )}
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

  if (!processingLifecycle) return null;

  const isFailed =
    processingLifecycle.processingPhase === "failed" ||
    processingLifecycle.feedListSyncState === "failed";
  const isCompleted =
    processingLifecycle.processingPhase === "completed" &&
    processingLifecycle.feedListSyncState === "succeeded";

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
          className="z-[1] shrink flex-row items-center gap-2"
          onPress={() => router.push("/feed")}
        >
          {isFailed ? (
            <IconAlertCircle color="white" size={19} />
          ) : isCompleted ? (
            <IconCheck color="white" size={19} />
          ) : null}
          <Text
            className="shrink font-paperlogy-semibold text-white"
            size="sm"
            numberOfLines={1}
          >
            {getBadgeLabel(
              t,
              processingLifecycle.processingPhase,
              displayProgressPercent,
              processingLifecycle.monitoringState,
              processingLifecycle.feedListSyncState,
            )}
          </Text>
          {processingLifecycle.processingPhase === "processing" ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(displayProgressPercent),
              }}
              pointerEvents="none"
              className="h-1 w-16 shrink-0 overflow-hidden rounded-sm bg-white/35"
            >
              <View
                className="h-full rounded-sm bg-white"
                style={{ width: `${displayProgressPercent}%` }}
              />
            </View>
          ) : null}
        </Pressable>
        {processingLifecycle.processingPhase !== "processing" ? (
          <Pressable
            accessibilityLabel={t(
              "feed.publishing.closeProcessingAccessibility",
            )}
            className="z-[1] ml-2"
            onPress={dismissProcessing}
          >
            <IconX color="white" size={18} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
