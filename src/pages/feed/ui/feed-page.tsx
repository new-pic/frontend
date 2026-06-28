import { gradients } from "@shared/constants";
import {
  Fab,
  Input,
  InputField,
  InputIcon,
  InputSlot,
  Text,
  VStack,
} from "@shared/ui";
import { IconPencil, IconSearch } from "@tabler/icons-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export function FeedPage() {
  return (
    <SafeAreaView>
      <VStack className="h-full px-8 py-4">
        <Input>
          <InputField placeholder="검색어를 입력해주세요." />
          <InputSlot>
            <InputIcon as={IconSearch} />
          </InputSlot>
        </Input>
        <Text>asdf</Text>
        <Fab className="w-15 h-15 rounded-full bottom-0 right-8">
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
