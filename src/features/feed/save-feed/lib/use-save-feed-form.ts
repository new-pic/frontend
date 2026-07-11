import { CreateFeedRequest, UpdateFeedRequest } from "@entities/feed";
import {
  CreateFeedRequestSchema,
  UpdateFeedRequestSchema,
} from "@entities/feed/model/schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";

type FeedFormMode = "CREATE" | "EDIT";

type FeedFormValues<T extends FeedFormMode> = T extends "CREATE"
  ? CreateFeedRequest
  : UpdateFeedRequest;

export interface UseSaveFeedFormProps<T extends FeedFormMode> {
  mode: T;
}

export function useSaveFeedForm<T extends FeedFormMode>({
  mode,
}: UseSaveFeedFormProps<T>) {
  return useForm<FeedFormValues<T>>({
    resolver: standardSchemaResolver(
      mode === "CREATE" ? CreateFeedRequestSchema : UpdateFeedRequestSchema,
    ),
  });
}
