import {
  CreateFeedFormSchema,
  FeedFormValues,
  UpdateFeedRequest,
  UpdateFeedRequestInput,
  UpdateFeedRequestSchema,
  UpdateFeedFormSchema,
} from "@entities/feed";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { getApiErrorMessage } from "@shared/api";
import {
  deleteStagedUploadFile,
  stageFileForUpload,
  useAppTranslation,
} from "@shared/lib";
import { useForm } from "react-hook-form";
import type { CreateFeedPublishingCommand } from "../publishing/feed-publishing-types";
import type { FeedFormMode } from "./feed-form-types";

export interface UseSaveFeedFormProps {
  mode: FeedFormMode;
}

interface SaveFeedSubmitHandlers {
  onCreate: (
    command: CreateFeedPublishingCommand,
  ) => boolean | Promise<boolean>;
  onUpdate: (request: UpdateFeedRequest) => boolean | Promise<boolean>;
}

export type UseSaveFeedFormReturn = ReturnType<typeof useSaveFeedForm>;

async function prepareCreateFeedCommand(
  data: FeedFormValues,
): Promise<CreateFeedPublishingCommand> {
  const { image, imageFileName, ...other } = data;
  const stagedImage = await stageFileForUpload({
    uri: image,
    fileName: imageFileName,
  });

  return { kind: "CREATE", image: stagedImage, ...other };
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
  const { t } = useAppTranslation();
  const form = useForm<FeedFormValues>({
    resolver: standardSchemaResolver(
      mode === "CREATE" ? CreateFeedFormSchema : UpdateFeedFormSchema,
    ),
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
    form.handleSubmit(
      async (data) => {
        try {
          if (mode === "CREATE") {
            const command = await prepareCreateFeedCommand(data);
            const accepted = await onCreate(command);
            if (!accepted) deleteStagedUploadFile(command.image);
            return;
          }

          const transformedData = transformToUpdateFeedRequest(data);
          const result = UpdateFeedRequestSchema.parse(transformedData);
          await onUpdate(result);
        } catch (error) {
          onErrorResult?.(
            getApiErrorMessage(error, t("feed.savePreparationFailed")),
          );
        }
      },
      (errors) => {
        const message =
          errors.image?.message ??
          errors.description?.message ??
          errors.tags?.message ??
          t("feed.validationCheck");
        onErrorResult?.(message);
      },
    );

  return { ...form, handleValidSubmit };
}
