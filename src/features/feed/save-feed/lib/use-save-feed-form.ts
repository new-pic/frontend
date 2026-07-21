import {
  CreateFeedRequest,
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
import { ObjectToFormData } from "@shared/lib/form-data";
import { useForm } from "react-hook-form";
import { FeedFormMode } from "../model";

export interface UseSaveFeedFormProps {
  mode: FeedFormMode;
}

export type UseSaveFeedFormReturn = ReturnType<typeof useSaveFeedForm>;

async function transformToCreateFeedRequest(
  data: FeedFormValues,
): Promise<FormData> {
  const { image, imageFileName, ...other } = data;
  const imageFile = await uriToFile({ uri: image, fileName: imageFileName });

  const parsedRequest = CreateFeedRequestSchema.safeParse({
    ...other,
    image: imageFile,
  });

  if (!parsedRequest.success) {
    throw parsedRequest.error;
  }

  const request: CreateFeedRequest = parsedRequest.data;

  const formData = ObjectToFormData(request);
  return formData;
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
    onValidResult: (data: FormData | UpdateFeedRequest) => void | Promise<void>,
    onErrorResult?: (error: unknown) => void,
  ) =>
    form.handleSubmit(async (data) => {
      try {
        if (mode === "CREATE") {
          const formData = await transformToCreateFeedRequest(data);
          await onValidResult(formData);
          return;
        }
        const transformedData = transformToUpdateFeedRequest(data);
        const result = UpdateFeedRequestSchema.parse(transformedData);
        await onValidResult(result);
      } catch (error) {
        onErrorResult?.(error);
      }
    });

  return { ...form, handleValidSubmit };
}
