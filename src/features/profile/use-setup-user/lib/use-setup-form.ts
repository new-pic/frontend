import {
  UpdateProfileRequest,
  UpdateProfileRequestSchema,
} from "@entities/users";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";

export type UseSetupFormReturn = ReturnType<typeof useSetupForm>;

export function useSetupForm() {
  return useForm<UpdateProfileRequest>({
    resolver: standardSchemaResolver(UpdateProfileRequestSchema),
    defaultValues: {
      profileImage: "",
      nickname: "",
    },
  });
}
