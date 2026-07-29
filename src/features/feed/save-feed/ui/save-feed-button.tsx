// 피드 게시하기 / 수정하기 공통 사용 버튼

import {
  CreateFeedRequest,
  feedQuery,
  UpdateFeedRequest,
} from "@entities/feed";
import { useFeedProcessingStore } from "@features/feed/feed-processing";
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
  const mutationToCreate = feedQuery.useCreateFeed();
  const mutationToUpdate = feedQuery.useUpdateFeed({ feedId });
  const startFeedProcessing = useFeedProcessingStore(
    (state) => state.start,
  );

  const actionText = isCreate ? "등록" : "수정";
  const isPending = form.formState.isSubmitting;

  const onRequestError = (errorMessage?: string) => {
    const message =
      errorMessage ??
      `피드를 ${actionText}하지 못했습니다. 잠시 후 다시 시도해주세요.`;
    Alert.alert(`피드 ${actionText} 실패`, message);
  };

  const handleUpdateSuccess = () => {
    Alert.alert("피드 수정 완료", "피드가 수정되었습니다.");
    router.replace("/feed");
  };

  const handleCreate = async (request: CreateFeedRequest) => {
    const job = await mutationToCreate.mutateAsync(request);
    startFeedProcessing(job);
    router.replace("/feed");
  };

  const handleUpdate = async (request: UpdateFeedRequest) => {
    await mutationToUpdate.mutateAsync(request);
    handleUpdateSuccess();
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
