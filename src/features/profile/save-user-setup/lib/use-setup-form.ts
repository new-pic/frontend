import { ProfileRequest, UpdateProfileRequestSchema } from "@entities/user";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";

export type UseSetupFormReturn = ReturnType<typeof useSetupForm>;

export function useSetupForm() {
  return useForm<ProfileRequest>({
    resolver: standardSchemaResolver(UpdateProfileRequestSchema),
    defaultValues: {
      profileImage: "",
      nickname: "",
    },
  });
}
