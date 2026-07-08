import { SetupButton, useSetupForm } from "@features/profile/use-setup-user";
import {
  Box,
  Button,
  ButtonIcon,
  HStack,
  Input,
  InputField,
  KeyboardDismissLayout,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { Controller } from "react-hook-form";
import { Keyboard, TouchableWithoutFeedback } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function ProfileEditPage() {
  const form = useSetupForm();

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView>
      <KeyboardDismissLayout>
        {" "}
        <VStack className="h-full pt-3 w-full" space="xl">
          <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
            <Button variant="ghost" size="icon" onPress={handleGoBack}>
              <ButtonIcon as={IconChevronLeft} />
            </Button>
            <Text className="font-semibold" size="lg">
              프로필 설정하기
            </Text>
            <Box className="w-10" />
          </HStack>
          <VStack className="px-6 flex-1 py-3">
            <VStack className="flex-1">
              <Controller
                name="nickname"
                rules={{
                  required: true,
                }}
                control={form.control}
                render={({ field }) => (
                  <VStack space="xs">
                    <Text className="font-medium">닉네임</Text>
                    <Input>
                      <InputField
                        value={field.value}
                        onChangeText={field.onChange}
                        placeholder="닉네임은 8자까지 가능합니다."
                      />
                    </Input>
                  </VStack>
                )}
              />
              {form.formState.errors.nickname && (
                <Text>{form.formState.errors.nickname.message}</Text>
              )}
            </VStack>
            <SetupButton form={form} />
          </VStack>
        </VStack>
      </KeyboardDismissLayout>
    </SafeAreaView>
  );
}
