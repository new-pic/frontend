import { feedQuery, type CreateFeedCommentRequest } from "@entities/feed";
import { Button, ButtonSpinner, ButtonText, Text, VStack } from "@shared/ui";
import { useWatch } from "react-hook-form";
import type { UseCreateFeedCommentFormReturn } from "../lib/use-create-feed-comment-form";

interface SaveCommentButtonProps {
  feedId: string;
  form: UseCreateFeedCommentFormReturn;
}

export function SaveCommentButton({
  feedId,
  form,
}: SaveCommentButtonProps) {
  const mutationToCreateComment = feedQuery.useCreateFeedComment({ feedId });
  const content = useWatch({
    control: form.control,
    name: "content",
  });

  const handlePress = form.handleSubmit(
    (request: CreateFeedCommentRequest) => {
      mutationToCreateComment.mutate(request, {
        onSuccess: () => {
          form.reset();
        },
      });
    },
  );

  return (
    <VStack className="items-end" space="xs">
      <Button
        variant="gradient"
        size="sm"
        className="min-w-16"
        disabled={
          mutationToCreateComment.isPending || content.trim().length === 0
        }
        onPress={handlePress}
      >
        {mutationToCreateComment.isPending ? (
          <ButtonSpinner color="white" />
        ) : (
          <ButtonText>등록</ButtonText>
        )}
      </Button>
      {mutationToCreateComment.isError ? (
        <Text size="xs" className="text-destructive">
          댓글 등록에 실패했습니다.
        </Text>
      ) : null}
    </VStack>
  );
}
