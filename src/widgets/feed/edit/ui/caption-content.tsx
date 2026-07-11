import { UseSaveFeedFormReturn } from "@features/feed/save-feed/lib/use-save-feed-form";
import {
  HStack,
  Icon,
  Pressable,
  Text,
  Textarea,
  TextareaInput,
  VStack,
} from "@shared/ui";
import { IconChevronRight } from "@tabler/icons-react-native";
import { Controller } from "react-hook-form";

interface CaptionContentProps {
  form: UseSaveFeedFormReturn;
}

export function CaptionContent({ form }: CaptionContentProps) {
  return (
    <VStack space="md" className="border-t border-outline-light flex-1">
      <Controller
        name="description"
        rules={{
          required: true,
        }}
        control={form.control}
        render={({ field }) => (
          <Textarea className="border-0 flex-1 px-8 py-2 ">
            <TextareaInput
              placeholder="내용을 입력해주세요."
              value={field.value}
              onChangeText={field.onChange}
            />
          </Textarea>
        )}
      />
      {form.formState.errors.description && (
        <Text>{form.formState.errors.description.message}</Text>
      )}
      <Pressable>
        <HStack className="border-t border-outline-light">
          <VStack className="flex-1 px-8 py-4" space="md">
            <HStack className="items-center justify-between">
              <Text># 해시태그 추가하기</Text>
              <Icon as={IconChevronRight} />
            </HStack>
            <HStack className="gap-1">
              {/* {tags.map((tag) => (
                <Badge key={tag}>
                  <BadgeText className="">{tag}</BadgeText>
                </Badge>
              ))} */}
            </HStack>
          </VStack>
        </HStack>
      </Pressable>
    </VStack>
  );
}
