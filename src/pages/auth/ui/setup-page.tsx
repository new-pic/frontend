import { SetupButton, useSetupForm } from "@features/auth/use-setup-user";
import { Input, InputField, Text } from "@shared/ui";
import { Controller } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";

export function SetupPage() {
  const form = useSetupForm();

  return (
    <SafeAreaView>
      <Controller
        name="nickname"
        rules={{
          required: true,
        }}
        control={form.control}
        render={({ field }) => (
          <Input>
            <InputField {...field} />
          </Input>
        )}
      />
      {form.formState.errors.nickname && <Text>This is required.</Text>}
      <SetupButton form={form} />
    </SafeAreaView>
  );
}
