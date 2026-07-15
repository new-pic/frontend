import { ReactNode } from "react";
import { View } from "react-native";
import PagerView, {
  PagerViewOnPageSelectedEvent,
} from "react-native-pager-view";

function SlidePageViewItem({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

interface SlidePageViewProps {
  initialPage: number;
  children: ReactNode;
  onPageSelected?: (page: number) => void;
}

export function SlidePageView({
  initialPage,
  children,
  onPageSelected,
}: SlidePageViewProps) {
  const handlePageSelected = (event: PagerViewOnPageSelectedEvent) => {
    onPageSelected?.(event.nativeEvent.position);
  };

  return (
    <PagerView
      style={{ flex: 1 }}
      initialPage={initialPage}
      onPageSelected={handlePageSelected}
    >
      {children}
    </PagerView>
  );
}

SlidePageView.Item = SlidePageViewItem;
