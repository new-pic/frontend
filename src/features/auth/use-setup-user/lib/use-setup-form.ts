import {
  UpdateProfileRequest,
  UpdateProfileRequestSchema,
} from "@entities/users";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type UseSetupFormReturn = ReturnType<typeof useSetupForm>;

type UpdateProfileInput = z.input<typeof UpdateProfileRequestSchema>;

export function useSetupForm() {
  return useForm<UpdateProfileRequest>({
    resolver: standardSchemaResolver(UpdateProfileRequestSchema),
    defaultValues: {
      nickname: "",
    },
  });
}
