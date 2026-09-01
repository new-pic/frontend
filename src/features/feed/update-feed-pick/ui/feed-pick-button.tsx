import { colors } from "@shared/ui/theme";
import { Button, ButtonIcon } from "@shared/ui";
import { IconBookmarkFilled } from "@tabler/icons-react-native";
import { useRef } from "react";
import { useRefreshSavedFeedGuideCache } from "../model/use-refresh-saved-feed-guide-cache";
import { feedPickQuery } from "../api";

interface FeedPickButtonProps {
  feedId?: string;
  isPicked?: boolean;
  tone?: "default" | "on-image";
  requireMember: () => Promise<boolean>;
}

const THROTTLE_DELAY = 500;

export function FeedPickButton({
  feedId,
  isPicked,
  tone = "default",
  requireMember,
}: FeedPickButtonProps) {
  const lastPressedAtRef = useRef(0);
  const mutationToSave = feedPickQuery.useSaveFeed();
  const mutationToUnsave = feedPickQuery.useUnsaveFeed();
  const refreshSavedFeedGuideCache = useRefreshSavedFeedGuideCache();
  const mutation = isPicked ? mutationToUnsave : mutationToSave;
  const isPending = mutationToSave.isPending || mutationToUnsave.isPending;
  const isOnImage = tone === "on-image";
  const iconColor = isPicked
    ? colors.brand.primary
    : isOnImage
      ? "white"
      : colors.brand.primary;

  const handlePress = async () => {
    if (!feedId || isPending) return;

    const now = Date.now();

    if (now - lastPressedAtRef.current <= THROTTLE_DELAY) return;
    lastPressedAtRef.current = now;

    if (!(await requireMember())) return;

    mutation.mutate(feedId, {
      onSuccess: async () => {
        if (isPicked) return;

        try {
          await refreshSavedFeedGuideCache();
        } catch {
          // 저장 자체는 완료됐으므로 목록 갱신 실패를 저장 실패로
          // 되돌리지 않습니다. 가이드 목록에서 다시 조회할 수 있습니다.
        }
      },
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      style={
        isOnImage
          ? {
              filter: [
                {
                  dropShadow: {
                    offsetX: 0,
                    offsetY: 2,
                    standardDeviation: 2,
                    color: "rgba(0, 0, 0, 0.55)",
                  },
                },
              ],
            }
          : undefined
      }
      disabled={isPending}
      accessibilityLabel={isPicked ? "피드 저장 취소" : "피드 저장"}
      onPress={handlePress}
    >
      <ButtonIcon
        className={isOnImage ? "w-8 h-8" : "w-7 h-7"}
        as={IconBookmarkFilled}
        color={iconColor}
        fill={isPicked ? colors.brand.primary : "transparent"}
      />
    </Button>
  );
}
