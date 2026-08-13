import {
  CONTENT_REPORT_DESCRIPTION_MAX_LENGTH,
  ContentReportTarget,
  feedReportQuery,
} from "@entities/feed";
import { getApiErrorMessage } from "@shared/api";
import {
  BottomSheetModal,
  Button,
  ButtonText,
  HStack,
  Icon,
  Pressable,
  Text,
  Textarea,
  TextareaInput,
  VStack,
} from "@shared/ui";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Controller, useWatch } from "react-hook-form";
import {
  CONTENT_REPORT_REASON_OPTIONS,
  getContentReportTargetLabel,
} from "../model/report-content";
import { useContentReportForm } from "../model/use-content-report-form";

interface ReportContentModalProps {
  target: ContentReportTarget;
  onClose: () => void;
}

export function ReportContentModal({
  target,
  onClose,
}: ReportContentModalProps) {
  const [isReasonListOpen, setIsReasonListOpen] = useState(false);
  const form = useContentReportForm();
  const reportMutation = feedReportQuery.useCreateContentReport();
  const reason = useWatch({ control: form.control, name: "reason" });
  const description =
    useWatch({ control: form.control, name: "description" }) ?? "";
  const targetLabel = getContentReportTargetLabel(target);
  const selectedReasonLabel = CONTENT_REPORT_REASON_OPTIONS.find(
    (option) => option.value === reason,
  )?.label;
  const isPending = reportMutation.isPending;

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = form.handleSubmit((request) => {
    reportMutation.mutate({ target, request });
  });

  if (reportMutation.isSuccess) {
    return (
      <BottomSheetModal
        open
        onClose={onClose}
        lockedSnapPoint="50%"
      >
        <VStack className="flex-1 items-center justify-center px-6" space="xl">
          <VStack className="items-center" space="sm">
            <Text size="xl" className="font-bold">
              신고가 접수되었습니다
            </Text>
            <Text className="text-center text-label-muted">
              접수된 {targetLabel}을 확인한 뒤 필요한 조치를 진행하겠습니다.
            </Text>
          </VStack>
          <Button variant="gradient" className="w-full" onPress={onClose}>
            <ButtonText>확인</ButtonText>
          </Button>
        </VStack>
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal
      open
      onClose={handleClose}
      snapPoints={["75%", "100%"]}
      isPanDownToCloseEnabled={!isPending}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, gap: 24 }}
        >
          <VStack space="xs">
            <Text size="xl" className="font-bold">
              {targetLabel} 신고
            </Text>
            <Text className="text-label-muted">
              신고 사유를 선택하고 필요한 경우 상세 내용을 입력해주세요.
            </Text>
          </VStack>

          <Controller
            name="reason"
            control={form.control}
            render={({ field }) => (
              <VStack space="sm">
                <Text className="font-semibold">신고 사유</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="신고 사유 선택"
                  accessibilityState={{ expanded: isReasonListOpen }}
                  className="min-h-12 flex-row items-center justify-between rounded-lg border border-outline px-4"
                  onPress={() => setIsReasonListOpen((isOpen) => !isOpen)}
                >
                  <Text
                    className={
                      selectedReasonLabel ? "text-black" : "text-label-muted"
                    }
                  >
                    {selectedReasonLabel ?? "사유를 선택해주세요."}
                  </Text>
                  <Icon
                    as={isReasonListOpen ? IconChevronUp : IconChevronDown}
                    className="h-5 w-5"
                  />
                </Pressable>

                {isReasonListOpen ? (
                  <VStack className="overflow-hidden rounded-lg border border-outline-light">
                    {CONTENT_REPORT_REASON_OPTIONS.map((option) => {
                      const isSelected = field.value === option.value;

                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: isSelected }}
                          className="min-h-12 flex-row items-center justify-between border-b border-outline-light px-4 last:border-b-0"
                          onPress={() => {
                            reportMutation.reset();
                            field.onChange(option.value);
                            setIsReasonListOpen(false);
                          }}
                        >
                          <Text className={isSelected ? "font-semibold" : ""}>
                            {option.label}
                          </Text>
                          {isSelected ? (
                            <Icon as={IconCheck} className="h-5 w-5 text-brand" />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </VStack>
                ) : null}
              </VStack>
            )}
          />

          <Controller
            name="description"
            control={form.control}
            render={({ field }) => (
              <VStack space="xs">
                <HStack className="items-center justify-between">
                  <Text className="font-semibold">상세 사유 (선택)</Text>
                  <Text size="xs" className="text-label-muted">
                    {description.length}/{CONTENT_REPORT_DESCRIPTION_MAX_LENGTH}
                  </Text>
                </HStack>
                <Textarea
                  className="h-32 border-outline"
                  isInvalid={!!form.formState.errors.description}
                >
                  <TextareaInput
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChangeText={(value) => {
                      reportMutation.reset();
                      field.onChange(value);
                    }}
                    placeholder="신고 내용을 입력해주세요."
                    maxLength={CONTENT_REPORT_DESCRIPTION_MAX_LENGTH}
                  />
                </Textarea>
                {form.formState.errors.description?.message ? (
                  <Text size="xs" className="text-destructive">
                    {form.formState.errors.description.message}
                  </Text>
                ) : null}
              </VStack>
            )}
          />

          {reportMutation.isError ? (
            <Text className="text-destructive">
              {getApiErrorMessage(
                reportMutation.error,
                `${targetLabel} 신고에 실패했습니다. 다시 시도해주세요.`,
              )}
            </Text>
          ) : null}

          <HStack className="items-center" space="md">
            <Button
              variant="outline"
              className="flex-1"
              disabled={isPending}
              onPress={handleClose}
            >
              <ButtonText>취소</ButtonText>
            </Button>
            <Button
              variant="gradient"
              className="flex-1"
              disabled={!reason || isPending}
              isLoading={isPending}
              onPress={handleSubmit}
            >
              <ButtonText>신고하기</ButtonText>
            </Button>
          </HStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}
