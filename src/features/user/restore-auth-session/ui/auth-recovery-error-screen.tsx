import { useAppTranslation } from "@shared/lib";
import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { recoverAuthSession } from "../model/recover-auth-session";

interface AuthRecoveryErrorScreenProps {
  isRetrying: boolean;
}

export function AuthRecoveryErrorScreen({
  isRetrying,
}: AuthRecoveryErrorScreenProps) {
  const { t } = useAppTranslation();

  return (
    <Center className="flex-1 bg-white px-8">
      <VStack className="w-full max-w-sm items-center gap-4">
        <Text size="xl" bold className="text-center">
          {t("user.authRecoveryTitle")}
        </Text>
        <Text className="text-center text-label-muted">
          {t("user.authRecoveryDescription")}
        </Text>
        <Button
          variant="gradient"
          size="lg"
          className="mt-2 w-full"
          isLoading={isRetrying}
          onPress={() => void recoverAuthSession()}
        >
          <ButtonText>{t("common.actions.retry")}</ButtonText>
        </Button>
      </VStack>
    </Center>
  );
}
