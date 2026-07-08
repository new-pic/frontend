import { SetupButton, useSetupForm } from "@features/profile/use-setup-user";
import { Box, HStack, Input, InputField, Text, VStack } from "@shared/ui";
import { Controller } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";

export function SetupPage() {
  const form = useSetupForm();

  return (
    <SafeAreaView>
      <VStack className="h-full pt-3 w-full" space="xl">
        <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
          <Text className="font-semibold" size="lg">
            프로필 설정하기
          </Text>
          <Box className="w-10" />
        </HStack>

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
      </VStack>
    </SafeAreaView>
  );
}
