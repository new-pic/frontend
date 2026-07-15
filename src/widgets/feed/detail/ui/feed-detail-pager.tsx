import { FeedResponse } from "@entities/feed";
import { SlidePageView } from "@shared/ui";
import { router } from "expo-router";
import { useState } from "react";
import { CommentSort } from "../model";
import { FeedDetailContent } from "./feed-detail-content";

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
}

export function FeedDetailPager({
  feeds,
  initialPageIndex,
  onReachLastPage,
}: FeedDetailPagerProps) {
  const [commentSort, setCommentSort] = useState<CommentSort>("latest");
  const [activePageIndex, setActivePageIndex] =
    useState<number>(initialPageIndex);

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

  return (
    <SlidePageView
      initialPage={initialPageIndex}
      onPageSelected={handleChangePage}
    >
      {feeds.map((feed, feedIndex) => (
        <SlidePageView.Item key={feed.id}>
          {Math.abs(activePageIndex - feedIndex) <= 1 ? (
            <FeedDetailContent
              feed={feed}
              commentSort={commentSort}
              setCommentSort={setCommentSort}
              isActivePage={activePageIndex === feedIndex}
              handleGoBack={() => router.back()}
            />
          ) : null}
        </SlidePageView.Item>
      ))}
    </SlidePageView>
  );
}
