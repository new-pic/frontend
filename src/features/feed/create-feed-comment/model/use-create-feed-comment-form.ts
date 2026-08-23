import {
  CreateFeedCommentRequest,
  CreateFeedCommentRequestSchema,
} from "@entities/feed";
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
