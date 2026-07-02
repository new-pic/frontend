import { HStack, Icon, PhotoGrid, Text, VStack } from "@shared/ui";
import { IconChevronRight } from "@tabler/icons-react-native";

import { Pressable } from "react-native";

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
];

export function ImageSelector() {
  return (
    <VStack space="md" className="border-t pt-3 border-outline-light">
      <Pressable className="mx-6">
        <HStack className="items-center" space="sm">
          <Text className="font-semibold" size="lg">
            최근 항목
          </Text>
          <Icon as={IconChevronRight} />
        </HStack>
      </Pressable>
      <PhotoGrid images={MOCK_IMAGES} columns={4} />
    </VStack>
  );
}
