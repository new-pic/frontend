import type { CreateFeedCommentRequest } from "@entities/feed";
import { useAppTranslation } from "@shared/lib";
import { Button, ButtonText, Text, VStack } from "@shared/ui";
import { useWatch } from "react-hook-form";
import type { UseCreateFeedCommentFormReturn } from "../model/use-create-feed-comment-form";
import { feedCommentQuery } from "../api";

interface SaveCommentButtonProps {
  feedId: string;
  form: UseCreateFeedCommentFormReturn;
  requireMember: () => Promise<boolean>;
}

export function SaveCommentButton({
  feedId,
  form,
  requireMember,
}: SaveCommentButtonProps) {
  const { t } = useAppTranslation();
  const mutationToCreateComment = feedCommentQuery.useCreateFeedComment({
    feedId,
  });
  const content = useWatch({
    control: form.control,
    name: "content",
  });

  const handlePress = form.handleSubmit(
    async (request: CreateFeedCommentRequest) => {
      if (!(await requireMember())) return;

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
        isLoading={mutationToCreateComment.isPending}
        onPress={handlePress}
      >
        <ButtonText>{t("feed.comments.submit")}</ButtonText>
      </Button>
      {mutationToCreateComment.isError ? (
        <Text size="xs" className="text-destructive">
          {t("feed.comments.submitFailed")}
        </Text>
      ) : null}
    </VStack>
  );
}
