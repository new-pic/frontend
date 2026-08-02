// 피드 게시하기 / 수정하기 공통 사용 버튼

import type { UpdateFeedRequest } from "@entities/feed";
import {
  type CreateFeedPublishingCommand,
  useFeedPublishingPipelineActive,
  useFeedPublishingStore,
} from "@features/feed/feed-processing";
import { Button, ButtonSpinner, ButtonText } from "@shared/ui";
import { router } from "expo-router";
import { Alert } from "react-native";
import { UseSaveFeedFormReturn } from "../lib/use-save-feed-form";
import { FeedFormMode } from "../model";

interface SaveFeedButtonProps {
  mode: FeedFormMode;
  form: UseSaveFeedFormReturn;
  feedId?: string;
}

export function SaveFeedButton({ mode, form, feedId }: SaveFeedButtonProps) {
  const isCreate = mode === "CREATE";
  const enqueue = useFeedPublishingStore((state) => state.enqueue);
  const isPipelineActive = useFeedPublishingPipelineActive();

  const actionText = isCreate ? "등록" : "수정";
  const isPending = form.formState.isSubmitting || isPipelineActive;

  const onRequestError = (errorMessage?: string) => {
    const message =
      errorMessage ??
      `피드를 ${actionText}하지 못했습니다. 잠시 후 다시 시도해주세요.`;
    Alert.alert(`피드 ${actionText} 실패`, message);
  };

  const handleCreate = (command: CreateFeedPublishingCommand) => {
    const accepted = enqueue(command);
    if (!accepted) {
      onRequestError("진행 중인 피드 저장 작업을 먼저 완료해주세요.");
      return false;
    }
    router.replace("/feed");
    return true;
  };

  const handleUpdate = (request: UpdateFeedRequest) => {
    if (!feedId) {
      onRequestError("수정할 피드 정보를 찾을 수 없습니다.");
      return false;
    }

    const accepted = enqueue({ kind: "UPDATE", feedId, ...request });
    if (!accepted) {
      onRequestError("진행 중인 피드 저장 작업을 먼저 완료해주세요.");
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
      onPress={handlePress}
    >
      {isPending ? (
        <ButtonSpinner />
      ) : (
        <ButtonText size="lg" className="font-semibold">
          {isCreate ? "게시하기" : "수정하기"}
        </ButtonText>
      )}
    </Button>
  );
}
