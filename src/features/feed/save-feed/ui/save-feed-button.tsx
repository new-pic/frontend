// 피드 게시하기 / 수정하기 공통 사용 버튼

import { feedQuery } from "@entities/feed";
import { Button, ButtonText } from "@shared/ui";
import { UseSaveFeedFormReturn } from "../lib/use-save-feed-form";
import { FeedFormMode } from "../model";

interface SaveFeedButtonProps {
  mode: FeedFormMode;
  form: UseSaveFeedFormReturn;
  feedId?: string;
}

export function SaveFeedButton({ mode, form, feedId }: SaveFeedButtonProps) {
  const isCreate = mode === "CREATE";
  const mutationToCreate = feedQuery.useCreateFeed();
  const mutationToUpdate = feedQuery.useUpdateFeed({ feedId });

  const handlePress = form.handleValidSubmit((data) => {
    if ("image" in data) {
      mutationToCreate.mutate(data);
    } else {
      mutationToUpdate.mutate(data);
    }
  });

  return (
    <Button className="flex-1 h-12.5 p-0 rounded-xl" variant="gradient">
      <ButtonText size="lg" className="font-semibold" onPress={handlePress}>
        {isCreate ? "게시하기" : "수정하기"}
      </ButtonText>
    </Button>
  );
}
