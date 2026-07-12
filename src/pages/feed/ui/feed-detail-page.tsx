import { feedQuery } from "@entities/feed";
import { FeedCommentForm } from "@features/feed/create-feed-comment";
import { FeedLikeButton } from "@features/feed/update-feed-like";
import { FeedPickButton } from "@features/feed/update-feed-pick";
import { colors } from "@shared/constants";
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  Button,
  ButtonIcon,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft, IconShare } from "@tabler/icons-react-native";
import {
  FeedCommentItem,
  FeedCommentsHeader,
  type CommentSort,
} from "@widgets/feed/detail/comments";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function FeedDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const feedId = id ?? "";
  const [commentSort, setCommentSort] = useState<CommentSort>("latest");

  const { data, isPending } = feedQuery.useReadFeed({ feedId });
  const {
    data: commentData,
    fetchNextPage,
    hasNextPage,
    isError: isCommentError,
    isFetchingNextPage,
    isPending: isCommentPending,
  } = feedQuery.useReadFeedComments({
    feedId,
    take: 20,
    sort: commentSort,
  });
  const comments = commentData?.pages.flatMap((page) => page.items) ?? [];

  const handleGoBack = () => {
    router.back();
  };

  const handleEndReached = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  };

  // 스켈레톤 처리 예정
  if (!id || !data || isPending) return null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={comments}
        keyExtractor={(comment) => comment.id}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            <VStack className="pt-3 w-full">
              <VStack className="px-6 items-start border-b border-outline-light">
                <Button variant="ghost" size="icon" onPress={handleGoBack}>
                  <ButtonIcon as={IconChevronLeft} />
                </Button>
                <HStack className="items-center justify-between w-full py-2">
                  <HStack space="md" className="items-center px-1 py-2 ">
                    <Avatar className="h-8 w-8">
                      <AvatarFallbackText>
                        {data.author.nickname}
                      </AvatarFallbackText>
                      <AvatarImage source={{ uri: data.author.profileImage }} />
                    </Avatar>
                    <Text size="sm" className="font-medium">
                      {data.author.nickname}
                    </Text>
                  </HStack>
                  <FeedPickButton feedId={data.id} isPicked={data.isPicked} />
                </HStack>
              </VStack>
              <Image
                source={{ uri: data.imageUrl }}
                style={{ width: "100%", aspectRatio: 4 / 5 }}
              />
              <HStack className="px-6 py-2 border-t border-b justify-between border-outline-light">
                <HStack className="items-center" space="xs">
                  <FeedLikeButton feedId={data.id} isLiked={data.isLiked} />
                  <Text className="text-sm font-medium">
                    {data.likeCount ?? 0}개
                  </Text>
                </HStack>
                <Button variant="ghost" size="icon" className="w-5 h-5">
                  <ButtonIcon className="w-5 h-5" as={IconShare} />
                </Button>
              </HStack>
              <VStack className="px-6 py-2 ">
                <Text className="text-sm text-link-text mb-1">
                  {data.tags.map((tag) => `#${tag} `).join(" ")}
                </Text>
                <Text className="text-sm whitespace-pre-line">
                  {data.description}
                </Text>
              </VStack>
            </VStack>
            <FeedCommentsHeader
              commentCount={data.commentCount}
              sort={commentSort}
              onChangeSort={setCommentSort}
            />
            <FeedCommentForm feedId={data.id} />
          </>
        }
        ListEmptyComponent={
          isCommentPending ? (
            <ActivityIndicator
              color={colors.brand.primary}
              style={{ paddingVertical: 32 }}
            />
          ) : (
            <Text className="py-8 text-center text-label-muted">
              {isCommentError
                ? "댓글을 불러오지 못했습니다."
                : "아직 작성된 댓글이 없습니다."}
            </Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.brand.primary}
              style={{ paddingVertical: 16 }}
            />
          ) : null
        }
        renderItem={({ item }) => <FeedCommentItem comment={item} />}
      />
    </SafeAreaView>
  );
}
