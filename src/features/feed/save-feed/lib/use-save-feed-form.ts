import {
  CreateFeedRequest,
  CreateFeedRequestSchema,
  FeedFormValues,
  FeedFormSchema,
  UpdateFeedRequest,
  UpdateFeedRequestInput,
  UpdateFeedRequestSchema,
} from "@entities/feed";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { uriToFile } from "@shared/lib";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { FeedFormMode } from "../model";

export interface UseSaveFeedFormProps {
  mode: FeedFormMode;
}

interface SaveFeedSubmitHandlers {
  onCreate: (request: CreateFeedRequest) => void | Promise<void>;
  onUpdate: (request: UpdateFeedRequest) => void | Promise<void>;
}

export type UseSaveFeedFormReturn = ReturnType<typeof useSaveFeedForm>;

async function transformToCreateFeedRequest(
  data: FeedFormValues,
): Promise<CreateFeedRequest> {
  const { image, imageFileName, ...other } = data;
  const imageFile = await uriToFile({ uri: image, fileName: imageFileName });

  const parsedRequest = CreateFeedRequestSchema.safeParse({
    ...other,
    image: imageFile,
  });

  if (!parsedRequest.success) {
    throw parsedRequest.error;
  }

  return parsedRequest.data;
}

function transformToUpdateFeedRequest(
  data: FeedFormValues,
): UpdateFeedRequestInput {
  const { image, imageFileName, ...other } = data;
  return {
    ...other,
  };
}

export function useSaveFeedForm({ mode }: UseSaveFeedFormProps) {
  const form = useForm<FeedFormValues>({
    resolver: standardSchemaResolver(FeedFormSchema),
    mode: "onChange",
    defaultValues: {
      image: "",
      imageFileName: undefined,
      description: "",
      tags: [],
    },
  });

  const handleValidSubmit = (
    { onCreate, onUpdate }: SaveFeedSubmitHandlers,
    onErrorResult?: (errorMessage?: string) => void,
  ) =>
    form.handleSubmit(async (data) => {
      try {
        console.log(data);

        if (mode === "CREATE") {
          const request = await transformToCreateFeedRequest(data);
          await onCreate(request);
          return;
        }
        const transformedData = transformToUpdateFeedRequest(data);
        const result = UpdateFeedRequestSchema.parse(transformedData);
        await onUpdate(result);
      } catch (error) {
        console.log("useSaveFeedForm.handleValidSubmit", JSON.stringify(error));
        const errorMessage =
          error instanceof AxiosError
            ? error.response?.data?.message
            : error instanceof Error
              ? error.message
              : undefined;

        onErrorResult?.(errorMessage);
      }
    });

  return { ...form, handleValidSubmit };
}
