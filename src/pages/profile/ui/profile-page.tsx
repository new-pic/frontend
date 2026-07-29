import { usersQuery } from "@entities/user";
import { colors, gradients } from "@shared/constants";
import { useMemberAccess } from "@shared/hooks";
import { useConfirm } from "@shared/lib";
import { useAuthStore } from "@shared/model/auth-store";
import {
  Avatar,
  AvatarFallbackText,
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
  IconHeartFilled,
  IconHelpCircleFilled,
  IconPencilFilled,
  IconUserFilled,
} from "@tabler/icons-react-native";
import { ProfileRtcPhotoPreview } from "@widgets/profile/rtc-photo-preview";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ProfileButtonMenu() {
  const handleGoMyFeed = () => {
    router.push("/profile/my");
  };

  const handleGoLikeFeed = async () => {
    router.push("/profile/like");
  };

  const handleGoSaveFeed = async () => {
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
          <Button variant="ghost" className="w-25">
            <VStack space="sm" className="flex-1 justify-center items-center">
              <ButtonIcon
                as={IconHelpCircleFilled}
                fill={"white"}
                className="h-8 w-8"
              />
              <ButtonText className="text-white">도움말</ButtonText>
            </VStack>
          </Button>
        </HStack>
      </LinearGradient>
    </HStack>
  );
}

export function ProfilePage() {
  const openConfirm = useConfirm();
  const requireMember = useMemberAccess();
  const isGuest = useAuthStore((state) => state.isGuest);
  const prepareGoogleLink = useAuthStore((state) => state.prepareGoogleLink);
  const logout = useAuthStore((state) => state.logout);
  const { data } = usersQuery.useReadMe({ enabled: !isGuest });

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
    router.replace("/");
  };

  const handleGoEdit = async () => {
    router.push("/profile/edit");
  };

  const handlePressProfile = async () => {
    if (isGuest) {
      handleGoLogin();
      return;
    }
    handleGoEdit();
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
              className={`h-20 w-20 ${isGuest ? "bg-brand-light border-brand" : ""}`}
            >
              {isGuest ? (
                <IconUserFilled size={42} color={colors.brand.primary} />
              ) : (
                <>
                  <AvatarFallbackText>{data?.nickname}</AvatarFallbackText>
                  {data?.profileImage ? (
                    <AvatarImage source={{ uri: data.profileImage }} />
                  ) : null}
                </>
              )}
            </Avatar>
            <VStack className="justify-center">
              <Text className="font-medium">
                {isGuest ? "로그인이 필요합니다." : data?.nickname}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start p-0"
                onPress={handlePressProfile}
              >
                <ButtonText className="text-link-text">
                  {isGuest ? "로그인 하러가기" : "프로필 변경"}
                </ButtonText>
              </Button>
            </VStack>
          </HStack>

          {!isGuest ? <ProfileButtonMenu /> : null}
          {!isGuest ? <ProfileRtcPhotoPreview /> : null}

          <VStack className="rounded-3xl border border-outline">
            <Pressable className="p-6">
              <Text size="sm">버그 제보하기</Text>
            </Pressable>
            <Divider className="bg-outline" />
            <Pressable className="p-6">
              <Text size="sm">서비스 약관</Text>
            </Pressable>
            <Divider className="bg-outline" />
            <Pressable className="p-6" onPress={handleLogout}>
              <Text size="sm">로그아웃</Text>
            </Pressable>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
