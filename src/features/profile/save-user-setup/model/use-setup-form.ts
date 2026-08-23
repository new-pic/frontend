import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import {
  ProfileEditFormSchema,
  ProfileEditFormValues,
} from "./profile-edit-form-schema";

export type UseSetupFormReturn = ReturnType<typeof useSetupForm>;

export function useSetupForm() {
  return useForm<ProfileEditFormValues>({
    resolver: standardSchemaResolver(ProfileEditFormSchema),
    defaultValues: {
      nickname: "",
      profileImageFile: undefined,
    },
  });
}
