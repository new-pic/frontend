import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { recoverAuthSession } from "../model/recover-auth-session";

export function AuthRecoveryErrorScreen() {
  return (
    <Center className="flex-1 bg-white px-8">
      <VStack className="w-full max-w-sm items-center gap-4">
        <Text size="xl" bold className="text-center">
          자동 로그인을 확인하지 못했어요
        </Text>
        <Text className="text-center text-label-muted">
          네트워크 연결을 확인한 뒤 다시 시도해주세요. 로그인 정보는 삭제하지
          않았어요.
        </Text>
        <Button
          variant="gradient"
          size="lg"
          className="mt-2 w-full"
          onPress={() => void recoverAuthSession()}
        >
          <ButtonText>다시 시도</ButtonText>
        </Button>
      </VStack>
    </Center>
  );
}
