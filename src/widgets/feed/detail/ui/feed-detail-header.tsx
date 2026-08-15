import type { FeedResponse } from "@entities/feed";
import { canReportContent } from "@features/feed/report-content";
import { useAuthStore } from "@shared/model";
import { Button, ButtonIcon, HStack } from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { ContentActionsMenu } from "./content-actions-menu";
import { FeedOwnerActionsMenu } from "./feed-owner-actions-menu";

interface FeedDetailHeaderProps {
  feed: FeedResponse;
  onBack: () => void;
  onReport: () => void;
}

export function FeedDetailHeader({
  feed,
  onBack,
  onReport,
}: FeedDetailHeaderProps) {
  const userId = useAuthStore((state) => state.userId);
  const canReport = canReportContent({
    authorId: feed.author.id,
    currentUserId: userId,
  });

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
      {canReport ? (
        <ContentActionsMenu
          accessibilityLabel="피드 더보기"
          accessibilityHint="신고 메뉴를 엽니다"
          items={[
            {
              key: "report",
              label: "신고하기",
              destructive: true,
              onPress: onReport,
            },
          ]}
        />
      ) : (
        <FeedOwnerActionsMenu feedId={feed.id} />
      )}
    </HStack>
  );
}
