import { feedQuery } from "@entities/feed";
import { colors } from "@shared/constants";
import { useMemberAccess } from "@shared/hooks";
import { Button, ButtonIcon } from "@shared/ui";
import { IconHeartFilled } from "@tabler/icons-react-native";
import { useRef } from "react";

interface FeedLikeButtonProps {
  feedId?: string;
  isLiked?: boolean;
}

const THROTTLE_DELAY = 500; // 0.5초

export function FeedLikeButton({ feedId, isLiked }: FeedLikeButtonProps) {
  const lastPressedAtRef = useRef<number>(0);
  const requireMember = useMemberAccess();
  const mutationToLike = feedQuery.useLikeFeed();
  const mutationToUnlike = feedQuery.useUnlikeFeed();
  const mutation = isLiked ? mutationToUnlike : mutationToLike;
  const isPending = mutationToLike.isPending || mutationToUnlike.isPending;

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
      className="w-6 h-6"
      disabled={isPending}
      onPress={handlePress}
    >
      <ButtonIcon
        className="w-6 h-6"
        as={IconHeartFilled}
        color={colors.brand.primary}
        fill={isLiked ? colors.brand.primary : "white"}
      />
    </Button>
  );
}
