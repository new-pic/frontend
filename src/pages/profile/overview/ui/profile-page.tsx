import { usersQuery } from "@entities/user";
import { useDeleteAccount } from "@features/user/delete-account";
import { EXTERNAL_LINKS } from "@shared/config";
import { useAppTranslation, useConfirm } from "@shared/lib";
import { useAuthStore } from "@shared/model";
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
  gradients,
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
  const { t } = useAppTranslation();
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
              <ButtonText className="text-white">
                {t("profile.myFeeds")}
              </ButtonText>
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
              <ButtonText className="text-white">
                {t("profile.likedFeeds")}
              </ButtonText>
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
              <ButtonText className="text-white">
                {t("profile.savedFeeds")}
              </ButtonText>
            </VStack>
          </Button>
        </HStack>
      </LinearGradient>
    </HStack>
  );
}

export function ProfilePage() {
  const { t } = useAppTranslation();
  const openConfirm = useConfirm();

  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);
  const isGuest = useAuthStore((state) => state.isGuest);
  const prepareAccountLink = useAuthStore((state) => state.prepareAccountLink);
  const logout = useAuthStore((state) => state.logout);

  const { data } = usersQuery.useReadMe();
  const { deleteAccount, isDeleting } = useDeleteAccount();

  const handleLogout = async () => {
    const response = await openConfirm({
      title: t("profile.logout"),
      message: t("profile.logoutConfirm"),
      destructive: true,
    });
    if (response) {
      await logout();
    }
  };

  const handleGoLogin = () => {
    prepareAccountLink();
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

  const handleGoBlockedUsers = () => {
    router.push("/profile/blocked-users");
  };

  const handleGoRtcPhotos = () => {
    router.push("/profile/rtc-photos");
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
        t("common.errors.pageLinkTitle"),
        t("profile.bugReportOpenFailed"),
      );
    }
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(EXTERNAL_LINKS.TERMS_OF_SERVICE);
    } catch {
      Alert.alert(
        t("common.errors.pageLinkTitle"),
        t("profile.termsOpenFailed"),
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
              <Text className="font-paperlogy-medium">{data?.nickname}</Text>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start p-0"
                onPress={handlePressProfile}
              >
                <ButtonText className="text-link-text">
                  {isGuest
                    ? t("profile.linkAccount")
                    : t("profile.editProfile")}
                </ButtonText>
              </Button>
            </VStack>
          </HStack>

          {!isGuest ? <ProfileButtonMenu /> : null}
          <ProfileRtcPhotoPreview onPress={handleGoRtcPhotos} />

          <VStack className="rounded-3xl border border-outline">
            <Pressable
              className="p-6"
              onPress={handleOpenBugReport}
              accessibilityRole="link"
            >
              <Text size="md">{t("profile.bugReport")}</Text>
            </Pressable>
            <Divider className="bg-outline" />
            <Pressable
              className="p-6"
              onPress={handleOpenTermsOfService}
              accessibilityRole="link"
            >
              <Text size="md">{t("profile.terms")}</Text>
            </Pressable>
            {isAuthenticated ? (
              <>
                <Divider className="bg-outline" />
                <Pressable className="p-6" onPress={handleGoBlockedUsers}>
                  <Text size="md">{t("profile.blockedUsers")}</Text>
                </Pressable>
              </>
            ) : null}
            <Divider className="bg-outline" />
            <Pressable className="p-6" onPress={handleLogout}>
              <Text size="md" className="text-red-500 font-paperlogy-semibold">
                {t("profile.logout")}
              </Text>
            </Pressable>
            {isAuthenticated && !isGuest ? (
              <>
                <Divider className="bg-outline" />
                <Pressable
                  className="p-6"
                  disabled={isDeleting}
                  onPress={deleteAccount}
                >
                  <Text
                    size="md"
                    className="text-red-500 font-paperlogy-semibold"
                  >
                    {t("profile.deleteAccount")}
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
