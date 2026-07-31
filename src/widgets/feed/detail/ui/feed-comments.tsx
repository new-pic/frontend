import type { FeedCommentResponse } from "@entities/feed";
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

interface FeedCommentsHeaderProps {
  commentCount: number;
  sort: CommentSort;
  onChangeSort: (sort: CommentSort) => void;
}

function formatCommentDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString("ko-KR");
}

export function FeedCommentItem({ comment }: { comment: FeedCommentResponse }) {
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
          <Text size="sm" className="text-label-muted">
            {formatCommentDate(comment.createdAt)}
          </Text>
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
  return (
    <HStack className="px-6 py-3 items-center justify-between border-t border-b border-outline-light">
      <Text className="font-semibold">댓글 {commentCount}개</Text>
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
            최신순
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
            오래된순
          </Text>
        </Pressable>
      </HStack>
    </HStack>
  );
}
