import { ContentReportTarget, FeedResponse } from "@entities/feed";
import { FeedCameraGuideFab } from "@features/camera/guide-feed";
import { ReportContentModal } from "@features/feed/report-content";
import { useRequireMember } from "@features/user/guard-member";
import { useBlockUser } from "@features/user/manage-user-block";
import { SlidePageView } from "@shared/ui";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommentSort } from "../model";
import {
  FEED_DETAIL_GUIDE_FAB_SIZE,
  getFeedDetailCommentBottomPadding,
  getFeedDetailGuideFabBottomOffset,
} from "../model/feed-detail-layout";
import { FeedDetailContent } from "./feed-detail-content";
import { FeedDetailHeader } from "./feed-detail-header";

const FEED_BUFFER_SIZE = 3;

/**
 * FeedDetailPager 컴포넌트는 피드 상세 페이지에서 여러 피드를 슬라이드 형식으로 보여주는 역할을 합니다.
 *
 * @param feeds - 피드 데이터 배열
 * @param initialPage - 초기 페이지 인덱스
 * @param onNearEnd - 사용자가 마지막 피드에 가까워졌을 때 호출되는 콜백 함수
 */
interface FeedDetailPagerProps {
  feeds: FeedResponse[];
  initialPageIndex: number;
  onReachLastPage: () => void;
  onBack?: () => void;
  onGuidePress?: (feed: FeedResponse) => void;
}

export function FeedDetailPager({
  feeds,
  initialPageIndex,
  onReachLastPage,
  onBack,
  onGuidePress,
}: FeedDetailPagerProps) {
  const [commentSort, setCommentSort] = useState<CommentSort>("latest");
  const [activePageIndex, setActivePageIndex] =
    useState<number>(initialPageIndex);
  const [reportTarget, setReportTarget] = useState<ContentReportTarget | null>(
    null,
  );
  const requireMember = useRequireMember();
  const { blockUser, isBlocking } = useBlockUser();
  const insets = useSafeAreaInsets();
  const activeFeed = useMemo(() => {
    if (activePageIndex < 0 || activePageIndex >= feeds.length) {
      return null;
    }
    return feeds[activePageIndex];
  }, [feeds, activePageIndex]);
  const contentBottomPadding = getFeedDetailCommentBottomPadding(insets.bottom);
  const fabBottomOffset = getFeedDetailGuideFabBottomOffset(insets.bottom);

  /**
   * 페이지가 변경되었을때,
   * activePage 상태를 업데이트하고, 사용자가 마지막 피드에 가까워졌는지 확인합니다.
   * @param page
   */
  const handleChangePage = (page: number) => {
    setActivePageIndex(page);

    if (page >= feeds.length - 1 - FEED_BUFFER_SIZE) {
      onReachLastPage();
    }
  };

  const handleRequestReport = useCallback(
    async (target: ContentReportTarget) => {
      if (!(await requireMember())) return;
      setReportTarget(target);
    },
    [requireMember],
  );

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  }, [onBack]);

  return (
    <View style={{ flex: 1 }}>
      {activeFeed ? (
        <FeedDetailHeader
          key={activeFeed.id}
          feed={activeFeed}
          onBack={handleBack}
          onReport={() =>
            void handleRequestReport({ type: "feed", id: activeFeed.id })
          }
          onBlockAuthor={() =>
            void blockUser({
              userId: activeFeed.author.id,
              nickname: activeFeed.author.nickname,
              onBlocked: handleBack,
            })
          }
          isBlockingAuthor={isBlocking}
        />
      ) : null}
      <SlidePageView
        initialPage={initialPageIndex}
        onPageSelected={handleChangePage}
      >
        {feeds.map((feed, feedIndex) => (
          <SlidePageView.Item key={feed.id}>
            {Math.abs(activePageIndex - feedIndex) <= 1 ? (
              <FeedDetailContent
                feed={feed}
                contentBottomPadding={contentBottomPadding}
                commentSort={commentSort}
                setCommentSort={setCommentSort}
                isActivePage={activePageIndex === feedIndex}
                requireMember={requireMember}
                onReportComment={(commentId) =>
                  void handleRequestReport({ type: "comment", id: commentId })
                }
                onBlockCommentAuthor={(author) =>
                  void blockUser({
                    userId: author.id,
                    nickname: author.nickname,
                  })
                }
                isBlockingAuthor={isBlocking}
              />
            ) : null}
          </SlidePageView.Item>
        ))}
      </SlidePageView>
      {activeFeed ? (
        <FeedCameraGuideFab
          feed={activeFeed}
          bottomOffset={fabBottomOffset}
          size={FEED_DETAIL_GUIDE_FAB_SIZE}
          onPress={onGuidePress ? () => onGuidePress(activeFeed) : undefined}
        />
      ) : null}
      {reportTarget ? (
        <ReportContentModal
          key={`${reportTarget.type}-${reportTarget.id}`}
          target={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      ) : null}
    </View>
  );
}
