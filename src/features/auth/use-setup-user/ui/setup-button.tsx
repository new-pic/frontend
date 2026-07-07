import { UpdateProfileRequest, usersQuery } from "@entities/users";
import { Button } from "@shared/ui";
import { router } from "expo-router";
import { UseSetupFormReturn } from "../lib/use-setup-form";

export function SetupButton({ form }: { form: UseSetupFormReturn }) {
  const mutationToUpdateProfile = usersQuery.useUpdateProfile();

  const onSubmit = async (data: UpdateProfileRequest) => {
    mutationToUpdateProfile.mutate(data, {
      onSuccess: () => {
        router.replace("/feed");
      },
    });
  };

  return <Button onPress={form.handleSubmit(onSubmit)}>설정</Button>;
}
