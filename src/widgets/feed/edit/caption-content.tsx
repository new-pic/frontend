import {
  Badge,
  BadgeText,
  HStack,
  Icon,
  Pressable,
  Text,
  Textarea,
  TextareaInput,
  VStack,
} from "@shared/ui";
import { IconChevronRight } from "@tabler/icons-react-native";

interface CaptionContentProps {
  tags: string[];
}

export function CaptionContent({ tags }: CaptionContentProps) {
  return (
    <VStack space="md" className="border-t border-outline-light flex-1">
      <Textarea className="border-0 flex-1 px-8 py-2 ">
        <TextareaInput placeholder="내용을 입력해주세요." />
      </Textarea>
      <Pressable>
        <HStack className="border-t border-outline-light">
          <VStack className="flex-1 px-8 py-4" space="md">
            <HStack className="items-center justify-between">
              <Text># 해시태그 추가하기</Text>
              <Icon as={IconChevronRight} />
            </HStack>
            <HStack className="gap-1">
              {tags.map((tag) => (
                <Badge key={tag}>
                  <BadgeText className="">{tag}</BadgeText>
                </Badge>
              ))}
            </HStack>
          </VStack>
        </HStack>
      </Pressable>
    </VStack>
  );
}
