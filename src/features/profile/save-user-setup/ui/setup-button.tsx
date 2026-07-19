import { UpdateProfileRequest, usersQuery } from "@entities/user";
import { Button, ButtonText } from "@shared/ui";
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

  return (
    <Button
      variant="gradient"
      className="w-full h-12.5 p-0 rounded-xl"
      onPress={form.handleSubmit(onSubmit)}
    >
      <ButtonText size="lg" className="font-semibold">
        설정하기
      </ButtonText>
    </Button>
  );
}
