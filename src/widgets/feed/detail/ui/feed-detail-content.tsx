import { feedQuery, FeedResponse } from "@entities/feed";
import { FeedCommentForm } from "@features/feed/create-feed-comment";
import {
  FeedImageLikeInteraction,
  FeedLikeButton,
  useFeedLikeController,
} from "@features/feed/update-feed-like";
import { FeedPickButton } from "@features/feed/update-feed-pick";
import { colors } from "@shared/constants";
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  FlatList,
  Image,
  View,
} from "react-native";
import { CommentSort, formatFeedDetailTime } from "../model";
import { FeedCommentItem, FeedCommentsHeader } from "./feed-comments";

interface FeedDetailContentProps {
  feed: FeedResponse;
  isActivePage: boolean;
  contentBottomPadding: number;
  commentSort: CommentSort;
  setCommentSort: (sort: CommentSort) => void;
}

export function FeedDetailContent({
  feed,
  isActivePage,
  contentBottomPadding,
  commentSort,
  setCommentSort,
}: FeedDetailContentProps) {
  const feedLike = useFeedLikeController({
    feedId: feed.id,
    isLiked: feed.isLiked,
  });
  const detailTime = formatFeedDetailTime({
    createdAt: feed.createdAt,
    updatedAt: feed.updatedAt,
  });

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
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleReachLastComment}
        onEndReachedThreshold={0.2}
        ListHeaderComponent={
          <>
            <VStack className="w-full">
              <View
                style={{
                  width: "100%",
                  aspectRatio: 4 / 5,
                  position: "relative",
                }}
              >
                <FeedImageLikeInteraction
                  enabled={isActivePage}
                  onToggle={feedLike.toggle}
                >
                  <Image
                    accessibilityLabel={`${feed.author.nickname}님의 피드 이미지`}
                    source={{ uri: feed.detailImageUrl }}
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                    }}
                  />
                </FeedImageLikeInteraction>
                <LinearGradient
                  colors={[
                    "rgba(0,0,0,0)",
                    "rgba(0,0,0,0.32)",
                  ]}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    left: 0,
                    height: 96,
                  }}
                />
                <HStack
                  className="items-center justify-between"
                  pointerEvents="box-none"
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    right: 16,
                  }}
                >
                  <HStack
                    className="items-center"
                    pointerEvents="none"
                    space="sm"
                  >
                    <View
                      style={{
                        filter: [
                          {
                            dropShadow: {
                              offsetX: 0,
                              offsetY: 2,
                              standardDeviation: 2,
                              color: "rgba(0, 0, 0, 0.55)",
                            },
                          },
                        ],
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallbackText>
                          {feed.author.nickname}
                        </AvatarFallbackText>
                        <AvatarImage
                          source={{ uri: feed.author.profileImage }}
                        />
                      </Avatar>
                    </View>
                    <Text
                      className="font-semibold text-white"
                      size="lg"
                      numberOfLines={1}
                      style={{
                        textShadowColor: "rgba(0,0,0,0.55)",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 4,
                      }}
                    >
                      {feed.author.nickname}
                    </Text>
                  </HStack>
                  <FeedPickButton
                    feedId={feed.id}
                    isPicked={feed.isPicked}
                    tone="on-image"
                  />
                </HStack>
                <HStack
                  className="items-center"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    paddingHorizontal: 24,
                    paddingVertical: 14,
                  }}
                >
                  <HStack className="items-center" space="xs">
                    <FeedLikeButton
                      isLiked={feed.isLiked}
                      isPending={feedLike.isPending}
                      tone="on-image"
                      onPress={() => void feedLike.toggle()}
                    />
                    <Text
                      className="font-semibold text-white"
                      size="lg"
                      style={{
                        fontVariant: ["tabular-nums"],
                        textShadowColor: "rgba(0,0,0,0.55)",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 4,
                      }}
                    >
                      {feed.likeCount ?? 0}개
                    </Text>
                  </HStack>
                </HStack>
              </View>
              <VStack
                className="px-6"
                space="2xl"
                style={{
                  minHeight: 120,
                  paddingVertical: 20,
                }}
              >
                <VStack space="xs">
                  <Text size="sm" className="text-link-text mb-1">
                    {feed.tags
                      .map((tag: string) => `#${tag} `)
                      .join(" ")}
                  </Text>
                  <Text
                    size="md"
                    className="whitespace-pre-line leading-6"
                  >
                    {feed.description}
                  </Text>
                </VStack>
                {detailTime ? (
                  <Text
                    selectable
                    size="sm"
                    className="w-full text-right text-label-muted"
                  >
                    {detailTime}
                  </Text>
                ) : null}
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
    </View>
  );
}
