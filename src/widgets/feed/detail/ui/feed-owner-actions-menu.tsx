import { useDeleteFeed } from "@features/feed/delete-feed";
import { useAppTranslation } from "@shared/lib";
import { router } from "expo-router";
import { ContentActionsMenu } from "./content-actions-menu";

interface FeedOwnerActionsMenuProps {
  feedId: string;
}

export function FeedOwnerActionsMenu({ feedId }: FeedOwnerActionsMenuProps) {
  const { t } = useAppTranslation();
  const { deleteFeed, isDeleting } = useDeleteFeed(feedId);

  const handleEdit = () => {
    router.push({
      pathname: "/feed/edit/[id]",
      params: { id: feedId },
    });
  };

  const handleDelete = () => {
    void deleteFeed();
  };

  return (
    <ContentActionsMenu
      accessibilityLabel={t("feed.moreAccessibility")}
      accessibilityHint={t("feed.ownerMoreHint")}
      items={[
        {
          key: "edit",
          label: t("common.actions.edit"),
          onPress: handleEdit,
        },
        {
          key: "delete",
          label: t("common.actions.delete"),
          destructive: true,
          disabled: isDeleting,
          onPress: handleDelete,
        },
      ]}
    />
  );
}
