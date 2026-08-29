import { HStack, Text, Textarea, TextareaInput, VStack } from "@shared/ui";
import { Controller, useWatch } from "react-hook-form";
import { useCreateFeedCommentForm } from "../model/use-create-feed-comment-form";
import { SaveCommentButton } from "./save-comment-button";

interface FeedCommentFormProps {
  feedId: string;
  requireMember: () => Promise<boolean>;
}

export function FeedCommentForm({
  feedId,
  requireMember,
}: FeedCommentFormProps) {
  const form = useCreateFeedCommentForm();
  const content = useWatch({
    control: form.control,
    name: "content",
  });

  return (
    <VStack className="px-6 py-4 border-b border-outline-light" space="xs">
      <Controller
        name="content"
        control={form.control}
        render={({ field }) => (
          <Textarea
            className="h-20 border-outline"
            isInvalid={!!form.formState.errors.content}
          >
            <TextareaInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="댓글을 입력해주세요."
              maxLength={500}
            />
          </Textarea>
        )}
      />
      <HStack className="items-center justify-between">
        <Text size="xs" className="text-label-muted">
          {content.length}/500
        </Text>
        <SaveCommentButton
          feedId={feedId}
          form={form}
          requireMember={requireMember}
        />
      </HStack>
      {form.formState.errors.content?.message ? (
        <Text size="xs" className="text-destructive">
          {form.formState.errors.content.message}
        </Text>
      ) : null}
    </VStack>
  );
}
