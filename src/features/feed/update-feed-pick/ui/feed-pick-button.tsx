import { feedQuery } from "@entities/feed";
import { colors } from "@shared/constants";
import { useMemberAccess } from "@shared/hooks";
import { Button, ButtonIcon } from "@shared/ui";
import { IconBookmarkFilled } from "@tabler/icons-react-native";
import { useRef } from "react";
import { useRefreshSavedFeedGuideCache } from "../model/use-refresh-saved-feed-guide-cache";

interface FeedPickButtonProps {
  feedId?: string;
  isPicked?: boolean;
}

const THROTTLE_DELAY = 500;

export function FeedPickButton({ feedId, isPicked }: FeedPickButtonProps) {
  const lastPressedAtRef = useRef(0);
  const requireMember = useMemberAccess();
  const mutationToSave = feedQuery.useSaveFeed();
  const mutationToUnsave = feedQuery.useUnsaveFeed();
  const refreshSavedFeedGuideCache =
    useRefreshSavedFeedGuideCache();
  const mutation = isPicked ? mutationToUnsave : mutationToSave;
  const isPending = mutationToSave.isPending || mutationToUnsave.isPending;

  const handlePress = async () => {
    if (!feedId || isPending) return;

    const now = Date.now();

    if (now - lastPressedAtRef.current <= THROTTLE_DELAY) return;
    lastPressedAtRef.current = now;

    if (!(await requireMember())) return;

    mutation.mutate(feedId, {
      onSuccess: async () => {
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
      className="w-6 h-6"
      disabled={isPending}
      onPress={handlePress}
    >
      <ButtonIcon
        className="w-6 h-6"
        as={IconBookmarkFilled}
        color={colors.brand.primary}
        fill={isPicked ? colors.brand.primary : "white"}
      />
    </Button>
  );
}
