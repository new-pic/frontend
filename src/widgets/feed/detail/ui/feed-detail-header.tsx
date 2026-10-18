import type { FeedResponse } from "@entities/feed";
import { canReportContent } from "@features/feed/report-content";
import { useAppTranslation } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { Button, ButtonIcon, HStack } from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { ContentActionsMenu } from "./content-actions-menu";
import { FeedOwnerActionsMenu } from "./feed-owner-actions-menu";

interface FeedDetailHeaderProps {
  feed: FeedResponse;
  onBack: () => void;
  onReport: () => void;
  onBlockAuthor: () => void;
  isBlockingAuthor?: boolean;
}

export function FeedDetailHeader({
  feed,
  onBack,
  onReport,
  onBlockAuthor,
  isBlockingAuthor = false,
}: FeedDetailHeaderProps) {
  const { t } = useAppTranslation();
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
        accessibilityLabel={t("feed.closeEditor")}
        onPress={onBack}
      >
        <ButtonIcon as={IconChevronLeft} />
      </Button>
      {canReport ? (
        <ContentActionsMenu
          accessibilityLabel={t("feed.moreAccessibility")}
          accessibilityHint={t("feed.moreHint")}
          items={[
            {
              key: "report",
              label: t("common.actions.report"),
              destructive: true,
              onPress: onReport,
            },
            {
              key: "block-author",
              label: t("common.actions.blockAuthor"),
              destructive: true,
              disabled: isBlockingAuthor,
              onPress: onBlockAuthor,
            },
          ]}
        />
      ) : (
        <FeedOwnerActionsMenu feedId={feed.id} />
      )}
    </HStack>
  );
}
