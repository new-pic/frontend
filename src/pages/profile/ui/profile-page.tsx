import { usersQuery } from "@entities/user";
import { useDeleteAccount } from "@features/user/delete-account";
import { EXTERNAL_LINKS, gradients } from "@shared/constants";
import { useConfirm } from "@shared/lib";
import { useAuthStore } from "@shared/model/auth-store";
import {
  Avatar,
  AvatarImage,
  Button,
  ButtonIcon,
  ButtonText,
  Divider,
  HStack,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import {
  IconBookmarkFilled,
  IconHeartFilled,
  IconPencilFilled,
  IconUserFilled,
} from "@tabler/icons-react-native";
import { ProfileRtcPhotoPreview } from "@widgets/profile/rtc-photo-preview";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ProfileButtonMenu() {
  const handleGoMyFeed = () => {
    router.push("/profile/my");
  };

  const handleGoLikeFeed = () => {
    router.push("/profile/like");
  };

  const handleGoSaveFeed = () => {
    router.push("/profile/save");
  };

  return (
    <HStack className="w-full h-25 overflow-hidden rounded-3xl">
      <LinearGradient
        {...gradients.primary}
        style={{
          width: "100%",
          height: "100%",
          alignItems: "center",
        }}
      >
        <HStack
          space="md"
          className="flex-1 items-center justify-around px-4 py-2"
        >
          <Button variant="ghost" className="w-25" onPress={handleGoMyFeed}>
            <VStack space="sm" className=" items-center">
              <ButtonIcon
                as={IconPencilFilled}
                fill={"white"}
                className="h-8 w-8"
              />
              <ButtonText className="text-white">내 피드</ButtonText>
            </VStack>
          </Button>
          <Divider orientation="vertical" className="h-full w-px bg-white/35" />
          <Button variant="ghost" className="w-25" onPress={handleGoLikeFeed}>
            <VStack space="sm" className="flex-1 justify-center items-center">
              <ButtonIcon
                as={IconHeartFilled}
                fill={"white"}
                className="h-8 w-8"
              />
              <ButtonText className="text-white">찜한 피드</ButtonText>
            </VStack>
          </Button>
          <Divider orientation="vertical" className="h-full w-px bg-white/35" />
          <Button variant="ghost" className="w-25" onPress={handleGoSaveFeed}>
            <VStack space="sm" className="flex-1 justify-center items-center">
              <ButtonIcon
                as={IconBookmarkFilled}
                fill={"white"}
                className="h-8 w-8"
              />
              <ButtonText className="text-white">저장한 피드</ButtonText>
            </VStack>
          </Button>
        </HStack>
      </LinearGradient>
    </HStack>
  );
}

export function ProfilePage() {
  const openConfirm = useConfirm();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isGuest = useAuthStore((state) => state.isGuest);
  const prepareGoogleLink = useAuthStore((state) => state.prepareGoogleLink);
  const logout = useAuthStore((state) => state.logout);
  const { data } = usersQuery.useReadMe();
  const { deleteAccount, isDeleting } = useDeleteAccount();

  const handleLogout = async () => {
    const response = await openConfirm({
      title: "로그아웃",
      message: "정말로 로그아웃하시겠습니까?",
      destructive: true,
    });
    if (response) {
      await logout();
    }
  };

  const handleGoLogin = () => {
    prepareGoogleLink();
    router.replace({
      pathname: "/",
      params: {
        returnTo: "/profile",
      },
    });
  };

  const handleGoEdit = () => {
    router.push("/profile/edit");
  };

  const handlePressProfile = () => {
    if (isGuest) {
      handleGoLogin();
      return;
    }
    handleGoEdit();
  };

  const handleOpenBugReport = async () => {
    try {
      await Linking.openURL(EXTERNAL_LINKS.BUG_REPORT);
    } catch {
      Alert.alert(
        "페이지 연결 실패",
        "버그 제보 페이지를 열지 못했습니다. 다시 시도해주세요.",
      );
    }
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(EXTERNAL_LINKS.TERMS_OF_SERVICE);
    } catch {
      Alert.alert(
        "페이지 연결 실패",
        "서비스 약관 페이지를 열지 못했습니다. 다시 시도해주세요.",
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        <VStack className="w-full" space="xl">
          <HStack space="xl" className="items-center px-1 py-2 ">
            <Avatar
              className="h-20 w-20"
              style={{ backgroundColor: "#b8b8b8" }}
            >
              {data?.profileImage ? (
                <AvatarImage source={{ uri: data.profileImage }} />
              ) : (
                <IconUserFilled size={42} color="white" fill="white" />
              )}
            </Avatar>
            <VStack className="justify-center">
              <Text className="font-medium">{data?.nickname}</Text>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start p-0"
                onPress={handlePressProfile}
              >
                <ButtonText className="text-link-text">
                  {isGuest ? "계정 연결하기" : "프로필 변경"}
                </ButtonText>
              </Button>
            </VStack>
          </HStack>

          {!isGuest ? <ProfileButtonMenu /> : null}
          <ProfileRtcPhotoPreview />

          <VStack className="rounded-3xl border border-outline">
            {/* <Pressable className="p-6">
              <Text size="md">도움말</Text>
            </Pressable>
            <Divider className="bg-outline" /> */}
            <Pressable
              className="p-6"
              onPress={handleOpenBugReport}
              accessibilityRole="link"
            >
              <Text size="md">버그 제보하기</Text>
            </Pressable>
            <Divider className="bg-outline" />
            <Pressable
              className="p-6"
              onPress={handleOpenTermsOfService}
              accessibilityRole="link"
            >
              <Text size="md">서비스 약관</Text>
            </Pressable>
            <Divider className="bg-outline" />
            <Pressable className="p-6" onPress={handleLogout}>
              <Text size="md" className="text-red-500 font-semibold">
                로그아웃
              </Text>
            </Pressable>
            {isLoggedIn && !isGuest ? (
              <>
                <Divider className="bg-outline" />
                <Pressable
                  className="p-6"
                  disabled={isDeleting}
                  onPress={deleteAccount}
                >
                  <Text size="md" className="text-red-500 font-semibold">
                    회원 탈퇴
                  </Text>
                </Pressable>
              </>
            ) : null}
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
