import {
  CONTENT_REPORT_DESCRIPTION_MAX_LENGTH,
  ContentReportTarget,
} from "@entities/feed";
import { getApiErrorMessage } from "@shared/api";
import { useAppTranslation } from "@shared/lib";
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
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Controller, useWatch } from "react-hook-form";
import { CONTENT_REPORT_REASON_OPTIONS } from "../model/report-content";
import { useContentReportForm } from "../model/use-content-report-form";
import { feedReportQuery } from "../api";

interface ReportContentModalProps {
  target: ContentReportTarget;
  onClose: () => void;
}

export function ReportContentModal({
  target,
  onClose,
}: ReportContentModalProps) {
  const { t } = useAppTranslation();
  const [isReasonListOpen, setIsReasonListOpen] = useState(false);
  const isSubmittingRef = useRef(false);
  const form = useContentReportForm();
  const reportMutation = feedReportQuery.useCreateContentReport();
  const reason = useWatch({ control: form.control, name: "reason" });
  const description =
    useWatch({ control: form.control, name: "description" }) ?? "";
  const targetLabel =
    target.type === "feed"
      ? t("feed.report.targetFeed")
      : t("feed.report.targetComment");
  const selectedReason = CONTENT_REPORT_REASON_OPTIONS.find(
    (option) => option.value === reason,
  );
  const selectedReasonLabel = selectedReason
    ? t(selectedReason.translationKey)
    : undefined;
  const isPending = reportMutation.isPending;

  const resetMutationIfIdle = () => {
    if (isSubmittingRef.current) return;
    reportMutation.reset();
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = form.handleSubmit((request) => {
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    reportMutation.mutate(
      { target, request },
      {
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      },
    );
  });

  if (reportMutation.isSuccess) {
    return (
      <BottomSheetModal open onClose={onClose} lockedSnapPoint="50%">
        <VStack className="flex-1 items-center justify-center px-6" space="xl">
          <VStack className="items-center" space="sm">
            <Text size="xl" className="font-paperlogy-bold">
              {t("feed.report.receivedTitle")}
            </Text>
            <Text className="text-center text-label-muted">
              {t("feed.report.receivedDescription", { target: targetLabel })}
            </Text>
          </VStack>
          <Button variant="gradient" className="w-full" onPress={onClose}>
            <ButtonText>{t("common.actions.confirm")}</ButtonText>
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
            <Text size="xl" className="font-paperlogy-bold">
              {t("feed.report.title", { target: targetLabel })}
            </Text>
            <Text className="text-label-muted">
              {t("feed.report.instructions")}
            </Text>
          </VStack>

          <Controller
            name="reason"
            control={form.control}
            render={({ field }) => (
              <VStack space="sm">
                <Text className="font-paperlogy-semibold">
                  {t("feed.report.reasonLabel")}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    "feed.report.selectReasonAccessibility",
                  )}
                  accessibilityState={{ expanded: isReasonListOpen }}
                  className="min-h-12 flex-row items-center justify-between rounded-lg border border-outline px-4"
                  onPress={() => setIsReasonListOpen((isOpen) => !isOpen)}
                >
                  <Text
                    className={
                      selectedReasonLabel ? "text-black" : "text-label-muted"
                    }
                  >
                    {selectedReasonLabel ?? t("feed.report.reasonPlaceholder")}
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
                            resetMutationIfIdle();
                            field.onChange(option.value);
                            setIsReasonListOpen(false);
                          }}
                        >
                          <Text
                            className={
                              isSelected ? "font-paperlogy-semibold" : ""
                            }
                          >
                            {t(option.translationKey)}
                          </Text>
                          {isSelected ? (
                            <Icon
                              as={IconCheck}
                              className="h-5 w-5 text-brand"
                            />
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
                  <Text className="font-paperlogy-semibold">
                    {t("feed.report.detailOptional")}
                  </Text>
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
                      resetMutationIfIdle();
                      field.onChange(value);
                    }}
                    placeholder={t("feed.report.descriptionPlaceholder")}
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
                t("feed.report.submitFailed", { target: targetLabel }),
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
              <ButtonText>{t("common.actions.cancel")}</ButtonText>
            </Button>
            <Button
              variant="gradient"
              className="flex-1"
              disabled={!reason || isPending}
              isLoading={isPending}
              onPress={handleSubmit}
            >
              <ButtonText>{t("common.actions.report")}</ButtonText>
            </Button>
          </HStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}
