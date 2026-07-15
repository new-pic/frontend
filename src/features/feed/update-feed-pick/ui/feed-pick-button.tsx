import { feedQuery } from "@entities/feed";
import { colors } from "@shared/constants";
import { Button, ButtonIcon } from "@shared/ui";
import { IconBookmarkFilled } from "@tabler/icons-react-native";
import { useRef } from "react";

interface FeedPickButtonProps {
  feedId?: string;
  isPicked?: boolean;
}

const THROTTLE_DELAY = 500;

export function FeedPickButton({ feedId, isPicked }: FeedPickButtonProps) {
  const lastPressedAtRef = useRef(0);
  const mutationToSave = feedQuery.useSaveFeed();
  const mutationToUnsave = feedQuery.useUnsaveFeed();
  const mutation = isPicked ? mutationToUnsave : mutationToSave;

  const handlePress = () => {
    if (!feedId || mutation.isPending) return;

    const now = Date.now();

    if (now - lastPressedAtRef.current <= THROTTLE_DELAY) return;
    lastPressedAtRef.current = now;
    mutation.mutate(feedId);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-6 h-6"
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
