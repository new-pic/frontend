// 피드 게시하기 / 수정하기 공통 사용 버튼

import type { UpdateFeedRequest } from "@entities/feed";
import { useAppTranslation } from "@shared/lib";
import { Button, ButtonText } from "@shared/ui";
import { router } from "expo-router";
import { Alert } from "react-native";
import { FeedFormMode, UseSaveFeedFormReturn } from "../model";
import { useFeedPublishingPipelineActive } from "../model/pipeline/use-feed-publishing-pipeline-active";
import { useFeedPublishingStore } from "../model/publishing/feed-publishing-store";
import type { CreateFeedPublishingCommand } from "../model/publishing/feed-publishing-types";

interface SaveFeedButtonProps {
  mode: FeedFormMode;
  form: UseSaveFeedFormReturn;
  feedId?: string;
}

export function SaveFeedButton({ mode, form, feedId }: SaveFeedButtonProps) {
  const { t } = useAppTranslation();
  const isCreate = mode === "CREATE";
  const enqueue = useFeedPublishingStore((state) => state.enqueue);
  const isPipelineActive = useFeedPublishingPipelineActive();

  const actionText = isCreate
    ? t("feed.publishing.createAction")
    : t("feed.publishing.updateAction");
  const isPending = form.formState.isSubmitting || isPipelineActive;

  const onRequestError = (errorMessage?: string) => {
    const message =
      errorMessage ?? t("feed.publishing.failed", { action: actionText });
    Alert.alert(
      t("feed.publishing.failedTitle", { action: actionText }),
      message,
    );
  };

  const handleCreate = (command: CreateFeedPublishingCommand) => {
    const accepted = enqueue(command);
    if (!accepted) {
      onRequestError(t("feed.publishing.activeTask"));
      return false;
    }
    router.replace("/feed");
    return true;
  };

  const handleUpdate = (request: UpdateFeedRequest) => {
    if (!feedId) {
      onRequestError(t("feed.publishing.missingFeed"));
      return false;
    }

    const accepted = enqueue({ kind: "UPDATE", feedId, ...request });
    if (!accepted) {
      onRequestError(t("feed.publishing.activeTask"));
      return false;
    }
    router.replace("/feed");
    return true;
  };

  const handlePress = form.handleValidSubmit(
    {
      onCreate: handleCreate,
      onUpdate: handleUpdate,
    },
    onRequestError,
  );

  return (
    <Button
      className="flex-1 h-12.5 p-0 rounded-xl"
      variant="gradient"
      disabled={isPending}
      isLoading={isPending}
      onPress={handlePress}
    >
      <ButtonText size="lg" className="font-paperlogy-semibold">
        {isCreate
          ? t("feed.publishing.createButton")
          : t("feed.publishing.updateButton")}
      </ButtonText>
    </Button>
  );
}
