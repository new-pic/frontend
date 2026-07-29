import { colors } from "@shared/constants";
import { Pressable, Text } from "@shared/ui";
import {
  IconAlertCircle,
  IconCheck,
  IconLoader2,
  IconX,
} from "@tabler/icons-react-native";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FEED_PROCESSING_CONFIG } from "../config/feed-processing-config";
import { useFeedProcessingStore } from "../model/feed-processing-store";

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
  const job = useFeedProcessingStore((state) => state.job);
  const dismiss = useFeedProcessingStore((state) => state.dismiss);

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
      <View style={[styles.badge, isFailed && styles.failedBadge]}>
        <Pressable
          className="flex-row items-center gap-2"
          onPress={() => router.push("/feed")}
        >
          <Icon color="white" size={19} />
          <Text className="text-white font-semibold" size="sm">
            {getBadgeLabel(
              job.phase,
              job.progressPercent,
              job.transportState,
              job.listRefreshState,
            )}
          </Text>
        </Pressable>
        {job.phase !== "processing" ? (
          <Pressable
            accessibilityLabel="피드 처리 상태 닫기"
            className="ml-2"
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
});
