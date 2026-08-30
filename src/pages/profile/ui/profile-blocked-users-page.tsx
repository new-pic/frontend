import { useUnblockUser } from "@features/user/manage-user-block";
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  Box,
  Button,
  ButtonIcon,
  ButtonText,
  Center,
  Divider,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { userBlockQuery } from "../api";

const BLOCKED_USERS_PAGE_SIZE = 20;

export function ProfileBlockedUsersPage() {
  const {
    data: blockedUserData,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = userBlockQuery.useReadBlockedUsers({
    take: BLOCKED_USERS_PAGE_SIZE,
  });
  const { unblockUser, isUnblocking, unblockingUserId } = useUnblockUser();
  const blockedUsers =
    blockedUserData?.pages.flatMap((page) => page.items) ?? [];

  const handleEndReached = () => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }
    void fetchNextPage();
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <VStack className="flex-1">
        <HStack className="items-center justify-between border-b border-outline-light px-6 py-3">
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel="프로필로 돌아가기"
            onPress={() => router.back()}
          >
            <ButtonIcon as={IconChevronLeft} />
          </Button>
          <Text className="font-semibold" size="lg">
            차단한 사용자
          </Text>
          <Box className="w-12" />
        </HStack>

        {isPending ? (
          <Center className="flex-1">
            <Spinner accessibilityLabel="차단한 사용자 불러오는 중" />
          </Center>
        ) : isError ? (
          <Center className="flex-1 px-6">
            <VStack className="w-full items-center" space="md">
              <Text className="text-center text-label-muted">
                차단한 사용자를 불러오지 못했습니다.
              </Text>
              <Button variant="outline" onPress={() => void refetch()}>
                <ButtonText>다시 시도</ButtonText>
              </Button>
            </VStack>
          </Center>
        ) : (
          <FlatList
            data={blockedUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              blockedUsers.length === 0
                ? { flexGrow: 1 }
                : { paddingBottom: 24 }
            }
            ItemSeparatorComponent={() => (
              <Divider className="bg-outline-light" />
            )}
            ListEmptyComponent={
              <Center className="flex-1 px-6">
                <Text className="text-center text-label-muted">
                  차단한 사용자가 없습니다.
                </Text>
              </Center>
            }
            ListFooterComponent={
              isFetchingNextPage ? <Spinner className="my-6" /> : null
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.2}
            renderItem={({ item }) => {
              const { blockedUser } = item;
              const isCurrentUserUnblocking =
                isUnblocking && unblockingUserId === blockedUser.id;

              return (
                <HStack className="items-center px-6 py-4" space="md">
                  <Avatar className="h-12 w-12">
                    <AvatarFallbackText>
                      {blockedUser.nickname}
                    </AvatarFallbackText>
                    {blockedUser.profileImage ? (
                      <AvatarImage source={{ uri: blockedUser.profileImage }} />
                    ) : null}
                  </Avatar>
                  <Text className="flex-1 font-semibold" numberOfLines={1}>
                    {blockedUser.nickname}
                  </Text>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isCurrentUserUnblocking}
                    disabled={isUnblocking}
                    accessibilityLabel={`${blockedUser.nickname}님 차단 해제`}
                    onPress={() =>
                      void unblockUser({
                        userId: blockedUser.id,
                        nickname: blockedUser.nickname,
                      })
                    }
                  >
                    <ButtonText>차단 해제</ButtonText>
                  </Button>
                </HStack>
              );
            }}
          />
        )}
      </VStack>
    </SafeAreaView>
  );
}
