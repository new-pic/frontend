import { feedQuery, FeedResponse } from "@entities/feed";
import { FeedCameraGuideFab } from "@features/camera/guide-feed";
import { FeedCommentForm } from "@features/feed/create-feed-comment";
import { DeleteFeedButton } from "@features/feed/delete-feed";
import { EditFeedButton } from "@features/feed/edit-feed";
import { FeedLikeButton } from "@features/feed/update-feed-like";
import { FeedPickButton } from "@features/feed/update-feed-pick";
import { colors } from "@shared/constants";
import { useAuthStore } from "@shared/model";
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
  ActivityIndicator,
  FlatList,
  Image,
  View,
} from "react-native";
import { CommentSort } from "../model";
import { FeedCommentItem, FeedCommentsHeader } from "./feed-comments";

interface FeedDetailContentProps {
  feed: FeedResponse;
  isActivePage: boolean;
  commentSort: CommentSort;
  setCommentSort: (sort: CommentSort) => void;
  handleGoBack: () => void;
}

export function FeedDetailContent({
  feed,
  isActivePage,
  commentSort,
  setCommentSort,
  handleGoBack,
}: FeedDetailContentProps) {
  const userId = useAuthStore((state) => state.userId);
  const isMyFeed = Boolean(userId) && feed.author.id === userId;

  const {
    data: commentData,
    fetchNextPage: fetchNextCommentPage,
    hasNextPage: hasNextCommentPage,
    isError: isCommentError,
    isFetchingNextPage: isFetchingNextCommentPage,
    isPending: isCommentPending,
  } = feedQuery.useReadFeedComments(
    {
      feedId: feed.id,
      take: 20,
      sort: commentSort,
    },
    {
      enabled: isActivePage,
    },
  );
  const comments = commentData?.pages.flatMap((page) => page.items) ?? [];

  const handleReachLastComment = () => {
    if (!hasNextCommentPage || isFetchingNextCommentPage) return;
    void fetchNextCommentPage();
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={comments}
        keyExtractor={(comment) => comment.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 104 }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleReachLastComment}
        onEndReachedThreshold={0.2}
        ListHeaderComponent={
          <>
            <VStack className="pt-3 w-full">
              <VStack className="px-6 items-start border-b border-outline-light">
                <HStack className="w-full items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={handleGoBack}
                  >
                    <ButtonIcon as={IconChevronLeft} />
                  </Button>
                  {isMyFeed ? (
                    <HStack className="items-center" space="xs">
                      <EditFeedButton feedId={feed.id} />
                      <DeleteFeedButton feedId={feed.id} />
                    </HStack>
                  ) : null}
                </HStack>
                <HStack className="items-center justify-between w-full py-2">
                  <HStack
                    space="md"
                    className="items-center px-1 py-2 "
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallbackText>
                        {feed.author.nickname}
                      </AvatarFallbackText>
                      <AvatarImage
                        source={{ uri: feed.author.profileImage }}
                      />
                    </Avatar>
                    <Text size="sm" className="font-medium">
                      {feed.author.nickname}
                    </Text>
                  </HStack>
                  <FeedPickButton
                    feedId={feed.id}
                    isPicked={feed.isPicked}
                  />
                </HStack>
              </VStack>
              <Image
                source={{ uri: feed.detailImageUrl }}
                style={{ width: "100%", aspectRatio: 4 / 5 }}
              />
              <HStack className="px-6 py-2 border-t border-b justify-between border-outline-light">
                <HStack className="items-center" space="xs">
                  <FeedLikeButton
                    feedId={feed.id}
                    isLiked={feed.isLiked}
                  />
                  <Text className="text-sm font-medium">
                    {feed.likeCount ?? 0}개
                  </Text>
                </HStack>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5"
                >
                  <ButtonIcon
                    className="w-5 h-5"
                    as={IconShare}
                  />
                </Button>
              </HStack>
              <VStack className="px-6 py-2 ">
                <Text className="text-sm text-link-text mb-1">
                  {feed.tags
                    .map((tag: string) => `#${tag} `)
                    .join(" ")}
                </Text>
                <Text className="text-sm whitespace-pre-line">
                  {feed.description}
                </Text>
              </VStack>
            </VStack>
            <FeedCommentsHeader
              commentCount={feed.commentCount}
              sort={commentSort}
              onChangeSort={setCommentSort}
            />
            <FeedCommentForm feedId={feed.id} />
          </>
        }
        ListEmptyComponent={
          isCommentPending && isActivePage ? (
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
          isFetchingNextCommentPage ? (
            <ActivityIndicator
              color={colors.brand.primary}
              style={{ paddingVertical: 16 }}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <FeedCommentItem comment={item} />
        )}
      />
      {isActivePage ? <FeedCameraGuideFab feed={feed} /> : null}
    </View>
  );
}
