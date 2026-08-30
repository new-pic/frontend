import { usersQuery } from "@entities/user";
import {
  ProfileImageField,
  SetupButton,
  useSetupForm,
} from "@features/profile/save-user-setup";
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
import { useEffect } from "react";
import { Controller } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";

export function ProfileEditPage() {
  const form = useSetupForm();
  const { data: profile } = usersQuery.useReadMe();
  const {
    reset,
    formState: { isDirty, isSubmitting },
  } = form;

  useEffect(() => {
    if (!profile || isDirty) return;

    reset({
      nickname: profile.nickname,
      profileImageFile: undefined,
    });
  }, [isDirty, profile, reset]);

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardDismissLayout>
        <VStack className="h-full pt-3 w-full" space="xl">
          <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="프로필로 돌아가기"
              onPress={handleGoBack}
            >
              <ButtonIcon as={IconChevronLeft} />
            </Button>
            <Text className="font-semibold" size="lg">
              프로필 설정하기
            </Text>
            <Box className="w-12" />
          </HStack>
          <VStack className="px-6 flex-1 py-3">
            <VStack className="flex-1" space="xl">
              <Controller
                name="profileImageFile"
                control={form.control}
                render={({ field }) => (
                  <ProfileImageField
                    currentImageUrl={profile?.profileImage}
                    disabled={isSubmitting}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
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
                        editable={!isSubmitting}
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
