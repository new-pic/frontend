import { UseSaveFeedFormReturn } from "@features/feed/save-feed/lib/use-save-feed-form";
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
import { TagBottomSheet } from "@widgets/feed/tags";
import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";

interface CaptionContentProps {
  form: UseSaveFeedFormReturn;
}

export function CaptionContent({ form }: CaptionContentProps) {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const selectedTags = useWatch({
    control: form.control,
    name: "tags",
    defaultValue: [],
  });

  const updateTags = (tags: string[]) => {
    form.setValue("tags", tags, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleSelectTag = (tag: string[]) => {
    updateTags(tag);
  };

  const handleOpenTagSheet = () => {
    setIsBottomSheetOpen(true);
  };

  const handleCloseTagSheet = () => {
    setIsBottomSheetOpen(false);
  };

  return (
    <>
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
        <Pressable onPress={handleOpenTagSheet}>
          <HStack className="border-t border-outline-light">
            <VStack className="flex-1 px-8 py-4" space="md">
              <HStack className="items-center justify-between">
                <Text># 해시태그 추가하기</Text>
                <Icon as={IconChevronRight} />
              </HStack>
              <HStack className="gap-1">
                {selectedTags?.map((tag) => (
                  <Badge key={tag}>
                    <BadgeText className="">{tag}</BadgeText>
                  </Badge>
                ))}
              </HStack>
            </VStack>
          </HStack>
        </Pressable>
      </VStack>
      <TagBottomSheet
        selectedTags={selectedTags}
        isOpen={isBottomSheetOpen}
        onSelectTag={handleSelectTag}
        onClose={handleCloseTagSheet}
      />
    </>
  );
}
