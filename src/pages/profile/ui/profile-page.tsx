import { usersQuery } from "@entities/users";
import { gradients } from "@shared/constants";
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
} from "@tabler/icons-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export function ProfilePage() {
  const { data } = usersQuery.useReadMe();
  return (
    <SafeAreaView>
      <VStack className="h-full pt-10 px-6 w-full" space="xl">
        <HStack space="xl" className="items-center px-1 py-2 ">
          <Avatar className="h-20 w-20">
            <AvatarFallbackText>{data?.nickname}</AvatarFallbackText>
            <AvatarImage source={{ uri: data?.profileImage }} />
          </Avatar>
          <VStack className="justify-center">
            <Text className="font-medium">{data?.nickname}</Text>
            <Button variant="ghost" size="sm" className="justify-start p-0">
              <ButtonText className="text-link-text">프로필 변경</ButtonText>
            </Button>
          </VStack>
        </HStack>
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
              <Button variant="ghost" className="w-25">
                <VStack space="sm" className=" items-center">
                  <ButtonIcon
                    as={IconPencilFilled}
                    fill={"white"}
                    className="h-8 w-8"
                  />
                  <ButtonText className="text-white">내 피드</ButtonText>
                </VStack>
              </Button>
              <Divider
                orientation="vertical"
                className="h-full w-px bg-white/35"
              />
              <Button variant="ghost" className="w-25">
                <VStack
                  space="sm"
                  className="flex-1 justify-center items-center"
                >
                  <ButtonIcon
                    as={IconHeartFilled}
                    fill={"white"}
                    className="h-8 w-8"
                  />
                  <ButtonText className="text-white">찜한 피드</ButtonText>
                </VStack>
              </Button>
              <Divider
                orientation="vertical"
                className="h-full w-px bg-white/35"
              />
              <Button variant="ghost" className="w-25">
                <VStack
                  space="sm"
                  className="flex-1 justify-center items-center"
                >
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
        <VStack className="rounded-3xl border border-outline">
          <Pressable className="p-6">
            <Text size="sm">버그 제보하기</Text>
          </Pressable>
          <Divider className="bg-outline" />
          <Pressable className="p-6">
            <Text size="sm">서비스 약관</Text>
          </Pressable>
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
