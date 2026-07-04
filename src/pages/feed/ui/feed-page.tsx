import { gradients } from "@shared/constants";
import { useConfirm } from "@shared/lib";

import {
  Badge,
  BadgeText,
  Fab,
  HStack,
  Input,
  InputField,
  InputIcon,
  InputSlot,
  Text,
  VStack,
} from "@shared/ui";
import { PhotoGrid } from "@shared/ui/photo-grid";
import { IconPencil, IconSearch } from "@tabler/icons-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const MOCK_IMAGES = [
  {
    id: "1",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "2",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "3",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "4",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "5",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "5",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "6",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "7",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "8",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "9",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "10",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "11",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "12",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "13",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "14",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "15",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "16",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "17",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "18",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "19",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "20",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "21",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "22",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "23",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "24",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "25",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "26",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "27",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "28",
    uri: "https://images.unsplash.com/photo-1566125882500-87e10f726cdc?q=80&w=3474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

export function FeedPage() {
  const openConfirm = useConfirm();
  const handlePressFeed = async () => {
    router.push("/feed/1");
  };

  const handlePressEdit = async () => {
    router.push("/feed/edit");
  };

  const handlePress = async () => {
    const a = await openConfirm({
      title: "확인",
      message: "정말로 삭제하시겠습니까?",
    });
  };
  return (
    <SafeAreaView edges={["top"]}>
      <VStack className="h-full pt-4">
        <VStack className="px-6 mb-2">
          <Text className="font-semibold mb-2" size="xl">
            피드
          </Text>
          <Input>
            <InputField placeholder="검색어를 입력해주세요." />
            <InputSlot onPress={handlePress}>
              <InputIcon as={IconSearch} />
            </InputSlot>
          </Input>
          <HStack className="gap-1 py-3">
            <Badge>
              <BadgeText className="">여행</BadgeText>
            </Badge>
            <Badge variant="outline">
              <BadgeText className="text-brand">카페</BadgeText>
            </Badge>
          </HStack>
        </VStack>
        <PhotoGrid images={MOCK_IMAGES} onPress={handlePressFeed} />
        <Fab
          className="w-15 h-15 rounded-full bottom-8 right-8"
          onPress={handlePressEdit}
        >
          <LinearGradient
            {...gradients.primary}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPencil size={36} color="white" />
          </LinearGradient>
        </Fab>
      </VStack>
    </SafeAreaView>
  );
}
