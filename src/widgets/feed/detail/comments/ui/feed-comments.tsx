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

export type CommentSort = "latest" | "oldest";

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
    <HStack className="px-6 py-3 items-start" space="md">
      <Avatar className="h-8 w-8">
        <AvatarFallbackText>{comment.user.nickname}</AvatarFallbackText>
        <AvatarImage source={{ uri: comment.user.profileImage }} />
      </Avatar>
      <VStack className="flex-1" space="xs">
        <HStack className="items-center justify-between">
          <Text size="sm" className="font-semibold">
            {comment.user.nickname}
          </Text>
          <Text size="xs" className="text-label-muted">
            {formatCommentDate(comment.createdAt)}
          </Text>
        </HStack>
        <Text size="sm">{comment.content}</Text>
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
        <Pressable onPress={() => onChangeSort("latest")}>
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
        <Pressable onPress={() => onChangeSort("oldest")}>
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
