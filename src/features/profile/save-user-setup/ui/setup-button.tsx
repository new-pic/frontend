import { ProfileRequest, usersQuery } from "@entities/user";
import { normalizeAuthReturnTo } from "@shared/lib";
import { Button, ButtonText } from "@shared/ui";
import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";
import { UseSetupFormReturn } from "../lib/use-setup-form";

export function SetupButton({ form }: { form: UseSetupFormReturn }) {
  const { returnTo: returnToParam } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();
  const mutationToUpdateProfile = usersQuery.useUpdateProfile();

  const onSubmit = async (data: ProfileRequest) => {
    mutationToUpdateProfile.mutate(data, {
      onSuccess: () => {
        router.replace(
          normalizeAuthReturnTo(returnToParam) as Href,
        );
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
