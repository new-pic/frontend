import type { FeedResponse } from "@entities/feed";
import { useAuthStore } from "@shared/model";
import { Button, ButtonIcon, HStack } from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { FeedOwnerActionsMenu } from "./feed-owner-actions-menu";

interface FeedDetailHeaderProps {
  feed: FeedResponse;
  onBack: () => void;
}

export function FeedDetailHeader({
  feed,
  onBack,
}: FeedDetailHeaderProps) {
  const userId = useAuthStore((state) => state.userId);
  const isMyFeed = Boolean(userId) && feed.author.id === userId;

  return (
    <HStack className="w-full items-center justify-between border-b border-outline-light px-6 py-3">
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel="피드 상세 닫기"
        onPress={onBack}
      >
        <ButtonIcon as={IconChevronLeft} />
      </Button>
      {isMyFeed ? <FeedOwnerActionsMenu feedId={feed.id} /> : null}
    </HStack>
  );
}
