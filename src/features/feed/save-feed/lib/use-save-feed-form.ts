import {
  CreateFeedRequest,
  CreateFeedRequestInput,
  FeedFormValues,
  UpdateFeedRequest,
  UpdateFeedRequestInput,
} from "@entities/feed";
import {
  CreateFeedRequestSchema,
  FeedFormSchema,
  UpdateFeedRequestSchema,
} from "@entities/feed/model/schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { uriToFile } from "@shared/lib/file";
import { useForm } from "react-hook-form";
import { FeedFormMode } from "../model";

export interface UseSaveFeedFormProps {
  mode: FeedFormMode;
}

export type UseSaveFeedFormReturn = ReturnType<typeof useSaveFeedForm>;

async function transformToCreateFeedRequest(
  data: FeedFormValues,
): Promise<CreateFeedRequestInput> {
  const { image, ...other } = data;

  const imageFile = await uriToFile({ uri: image });
  return {
    ...other,
    image: imageFile,
  };
}

function transformToUpdateFeedRequest(
  data: FeedFormValues,
): UpdateFeedRequestInput {
  const { image, ...other } = data;
  return {
    ...other,
  };
}

export function useSaveFeedForm({ mode }: UseSaveFeedFormProps) {
  const form = useForm<FeedFormValues>({
    resolver: standardSchemaResolver(FeedFormSchema),
    defaultValues: {
      tags: ["여행"],
    },
  });

  const handleValidSubmit = (
    onValidResult: (data: CreateFeedRequest | UpdateFeedRequest) => void,
  ) =>
    form.handleSubmit(async (data) => {
      if (mode === "CREATE") {
        const transformedData = await transformToCreateFeedRequest(data);
        const result = CreateFeedRequestSchema.parse(transformedData);
        onValidResult(result);
        return;
      }
      const transformedData = transformToUpdateFeedRequest(data);
      const result = UpdateFeedRequestSchema.parse(transformedData);
      onValidResult(result);
    });

  return { ...form, handleValidSubmit };
}
