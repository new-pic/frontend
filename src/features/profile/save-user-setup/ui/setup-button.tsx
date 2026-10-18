import { getApiErrorMessage } from "@shared/api";
import { normalizeAuthReturnTo, useAppTranslation } from "@shared/lib";
import { Button, ButtonText } from "@shared/ui";
import { Href, router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";
import { prepareProfileUpdateRequest } from "../lib/prepare-profile-update-request";
import type { ProfileEditFormValues } from "../model/profile-edit-form-schema";
import type { UseSetupFormReturn } from "../model/use-setup-form";
import { userProfileQuery } from "../api";

export function SetupButton({ form }: { form: UseSetupFormReturn }) {
  const { t } = useAppTranslation();
  const { returnTo: returnToParam } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();
  const mutationToUpdateProfile = userProfileQuery.useUpdateProfile();

  const onSubmit = async (data: ProfileEditFormValues) => {
    try {
      const request = await prepareProfileUpdateRequest(data);
      await mutationToUpdateProfile.mutateAsync(request);
      router.replace(
        normalizeAuthReturnTo(returnToParam ?? "/profile") as Href,
      );
    } catch (error) {
      Alert.alert(
        t("profile.updateFailedTitle"),
        getApiErrorMessage(error, t("profile.updateFailed")),
      );
    }
  };

  const isSubmitting =
    form.formState.isSubmitting || mutationToUpdateProfile.isPending;

  return (
    <Button
      variant="gradient"
      className="w-full h-12.5 p-0 rounded-xl"
      disabled={isSubmitting}
      isLoading={isSubmitting}
      onPress={form.handleSubmit(onSubmit)}
    >
      <ButtonText size="lg" className="font-semibold">
        {t("profile.setup")}
      </ButtonText>
    </Button>
  );
}
