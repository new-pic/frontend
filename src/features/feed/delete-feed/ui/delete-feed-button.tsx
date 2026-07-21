import { feedQuery } from "@entities/feed";
import { useConfirm } from "@shared/lib";
import { Button, ButtonIcon } from "@shared/ui";
import { IconTrash } from "@tabler/icons-react-native";
import { router } from "expo-router";

interface DeleteFeedButtonProps {
  feedId: string;
}

export function DeleteFeedButton({ feedId }: DeleteFeedButtonProps) {
  const openConfirm = useConfirm();
  const mutationToDelete = feedQuery.useDeleteFeed();

  const handlePress = async () => {
    if (mutationToDelete.isPending) return;

    const shouldDelete = await openConfirm({
      title: "피드 삭제",
      message: "삭제한 피드는 복구할 수 없습니다. 정말 삭제하시겠습니까?",
      confirmText: "삭제",
      cancelText: "취소",
      destructive: true,
    });

    if (!shouldDelete) return;

    mutationToDelete.mutate(feedId);
    router.replace("/feed");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      disabled={mutationToDelete.isPending}
      accessibilityLabel="피드 삭제"
      onPress={handlePress}
    >
      <ButtonIcon as={IconTrash} className="h-5 w-5 text-destructive" />
    </Button>
  );
}
