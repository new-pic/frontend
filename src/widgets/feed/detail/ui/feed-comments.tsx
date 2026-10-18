import type { FeedCommentResponse } from "@entities/feed";
import { canReportContent } from "@features/feed/report-content";
import { useAppTranslation } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  HStack,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { CommentSort } from "../model";
import { ContentActionsMenu } from "./content-actions-menu";

interface FeedCommentsHeaderProps {
  commentCount: number;
  sort: CommentSort;
  onChangeSort: (sort: CommentSort) => void;
}

function formatCommentDate(createdAt: string, language: string) {
  return new Date(createdAt).toLocaleDateString(language);
}

export function FeedCommentItem({
  comment,
  onReport,
  onBlockAuthor,
  isBlockingAuthor = false,
}: {
  comment: FeedCommentResponse;
  onReport: () => void;
  onBlockAuthor: () => void;
  isBlockingAuthor?: boolean;
}) {
  const { i18n, t } = useAppTranslation();
  const userId = useAuthStore((state) => state.userId);
  const canReport = canReportContent({
    authorId: comment.user.id,
    currentUserId: userId,
  });

  return (
    <HStack className="px-6 py-4 items-start" space="md">
      <Avatar className="h-10 w-10">
        <AvatarFallbackText>{comment.user.nickname}</AvatarFallbackText>
        <AvatarImage source={{ uri: comment.user.profileImage }} />
      </Avatar>
      <VStack className="flex-1" space="xs">
        <HStack className="items-center justify-between">
          <Text size="md" className="font-semibold">
            {comment.user.nickname}
          </Text>
          <HStack className="items-center" space="xs">
            <Text size="sm" className="text-label-muted">
              {formatCommentDate(
                comment.createdAt,
                i18n.resolvedLanguage ?? "ko",
              )}
            </Text>
            {canReport ? (
              <ContentActionsMenu
                accessibilityLabel={t("feed.comments.moreAccessibility", {
                  nickname: comment.user.nickname,
                })}
                accessibilityHint={t("feed.comments.moreHint")}
                iconClassName="h-5 w-5"
                items={[
                  {
                    key: "report",
                    label: t("common.actions.report"),
                    destructive: true,
                    onPress: onReport,
                  },
                  {
                    key: "block-author",
                    label: t("common.actions.blockAuthor"),
                    destructive: true,
                    disabled: isBlockingAuthor,
                    onPress: onBlockAuthor,
                  },
                ]}
              />
            ) : null}
          </HStack>
        </HStack>
        <Text size="md" className="leading-6">
          {comment.content}
        </Text>
      </VStack>
    </HStack>
  );
}

export function FeedCommentsHeader({
  commentCount,
  sort,
  onChangeSort,
}: FeedCommentsHeaderProps) {
  const { t } = useAppTranslation();

  return (
    <HStack className="px-6 py-3 items-center justify-between border-t border-b border-outline-light">
      <Text className="font-semibold">
        {t("feed.comments.count", { count: commentCount })}
      </Text>
      <HStack className="items-center" space="md">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: sort === "latest" }}
          className="min-h-12 min-w-12 items-center justify-center px-2"
          onPress={() => onChangeSort("latest")}
        >
          <Text
            size="sm"
            className={
              sort === "latest"
                ? "font-semibold text-brand"
                : "text-label-muted"
            }
          >
            {t("feed.comments.latest")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: sort === "oldest" }}
          className="min-h-12 min-w-12 items-center justify-center px-2"
          onPress={() => onChangeSort("oldest")}
        >
          <Text
            size="sm"
            className={
              sort === "oldest"
                ? "font-semibold text-brand"
                : "text-label-muted"
            }
          >
            {t("feed.comments.oldest")}
          </Text>
        </Pressable>
      </HStack>
    </HStack>
  );
}
