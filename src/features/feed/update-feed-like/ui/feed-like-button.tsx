import { feedQuery } from "@entities/feed";
import { colors } from "@shared/constants";
import { useMemberAccess } from "@shared/hooks";
import { Button, ButtonIcon } from "@shared/ui";
import { IconHeartFilled } from "@tabler/icons-react-native";
import { useRef } from "react";

interface FeedLikeButtonProps {
  feedId?: string;
  isLiked?: boolean;
  tone?: "default" | "on-image";
}

const THROTTLE_DELAY = 500; // 0.5초

export function FeedLikeButton({
  feedId,
  isLiked,
  tone = "default",
}: FeedLikeButtonProps) {
  const lastPressedAtRef = useRef<number>(0);
  const requireMember = useMemberAccess();
  const mutationToLike = feedQuery.useLikeFeed();
  const mutationToUnlike = feedQuery.useUnlikeFeed();
  const mutation = isLiked ? mutationToUnlike : mutationToLike;
  const isPending = mutationToLike.isPending || mutationToUnlike.isPending;
  const isOnImage = tone === "on-image";
  const iconColor = isOnImage ? "white" : colors.brand.primary;
  const iconFill = isLiked
    ? colors.brand.primary
    : isOnImage
      ? "transparent"
      : "white";

  const handlePress = async () => {
    if (!feedId || isPending) return;

    const now = Date.now();

    if (now - lastPressedAtRef.current <= THROTTLE_DELAY) return;
    lastPressedAtRef.current = now;

    if (!(await requireMember())) return;

    mutation.mutate(feedId);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={isOnImage ? "w-8 h-8" : "w-6 h-6"}
      disabled={isPending}
      accessibilityLabel={isLiked ? "좋아요 취소" : "좋아요"}
      onPress={handlePress}
    >
      <ButtonIcon
        className={isOnImage ? "w-8 h-8" : "w-6 h-6"}
        as={IconHeartFilled}
        color={iconColor}
        fill={iconFill}
      />
    </Button>
  );
}
