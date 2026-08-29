import { useDeleteFeed } from "@features/feed/delete-feed";
import { router } from "expo-router";
import { ContentActionsMenu } from "./content-actions-menu";

interface FeedOwnerActionsMenuProps {
  feedId: string;
}

export function FeedOwnerActionsMenu({
  feedId,
}: FeedOwnerActionsMenuProps) {
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
      accessibilityLabel="피드 더보기"
      accessibilityHint="수정 및 삭제 메뉴를 엽니다"
      items={[
        {
          key: "edit",
          label: "수정하기",
          onPress: handleEdit,
        },
        {
          key: "delete",
          label: "삭제하기",
          destructive: true,
          disabled: isDeleting,
          onPress: handleDelete,
        },
      ]}
    />
  );
}
