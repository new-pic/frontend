import type { CreateFeedCommentRequest } from "@entities/feed";
import { CreateFeedCommentRequestSchema } from "@entities/feed/model/schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";

export type UseCreateFeedCommentFormReturn = ReturnType<
  typeof useCreateFeedCommentForm
>;

export function useCreateFeedCommentForm() {
  return useForm<CreateFeedCommentRequest>({
    resolver: standardSchemaResolver(CreateFeedCommentRequestSchema),
    defaultValues: {
      content: "",
    },
  });
}
