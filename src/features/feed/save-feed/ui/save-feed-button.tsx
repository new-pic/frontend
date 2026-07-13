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
    if (mode === "CREATE") {
      mutationToCreate.mutate(data as FormData);
    } else {
      mutationToUpdate.mutate(data as Exclude<typeof data, FormData>);
    }
  });

  return (
    <Button
      className="flex-1 h-12.5 p-0 rounded-xl"
      variant="gradient"
      disabled={mutationToCreate.isPending || mutationToUpdate.isPending}
      onPress={handlePress}
    >
      <ButtonText size="lg" className="font-semibold">
        {isCreate ? "게시하기" : "수정하기"}
      </ButtonText>
    </Button>
  );
}
