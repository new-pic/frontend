import type { FeedResponse } from "@entities/feed";
import { gradients } from "@shared/constants";
import { Pressable } from "@shared/ui";
import { IconCamera } from "@tabler/icons-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { memo } from "react";
import { View } from "react-native";
import { createCameraGuideHref } from "../model/camera-guide-navigation";

interface FeedCameraGuideFabProps {
  feed: Pick<FeedResponse, "id">;
  bottomOffset: number;
  size: number;
}

export const FeedCameraGuideFab = memo(function FeedCameraGuideFab({
  feed,
  bottomOffset,
  size,
}: FeedCameraGuideFabProps) {
  const cameraHref = createCameraGuideHref(feed.id);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: 24,
        bottom: bottomOffset,
        zIndex: 20,
      }}
    >
      <Link href={cameraHref} push asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이 피드를 가이드로 카메라 열기"
        >
          <LinearGradient
            {...gradients.primary}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderCurve: "continuous",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 5px 16px rgba(255,90,100,0.3)",
            }}
          >
            <IconCamera size={28} color="white" strokeWidth={2.2} />
          </LinearGradient>
        </Pressable>
      </Link>
    </View>
  );
});
