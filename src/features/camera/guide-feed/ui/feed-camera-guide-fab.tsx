import type { FeedResponse } from "@entities/feed";
import { gradients } from "@shared/constants";
import { Pressable, Text } from "@shared/ui";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { View } from "react-native";
import { createCameraGuideHref } from "../model/camera-guide-navigation";

interface FeedCameraGuideFabProps {
  feed: Pick<FeedResponse, "id" | "thumbnailUrl">;
}

export function FeedCameraGuideFab({
  feed,
}: FeedCameraGuideFabProps) {
  const cameraHref = createCameraGuideHref(feed.id);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: 24,
        bottom: 24,
        zIndex: 20,
        alignItems: "flex-end",
      }}
    >
      <Link href={cameraHref} push asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이 피드를 가이드로 카메라 열기"
          style={{ alignItems: "flex-end", gap: 8 }}
        >
          <View
            style={{
              width: 58,
              height: 58,
              marginRight: 48,
              borderRadius: 29,
              borderCurve: "continuous",
              backgroundColor: "rgba(0,0,0,0.78)",
              padding: 4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.32)",
            }}
          >
            <Image
              source={feed.thumbnailUrl}
              recyclingKey={feed.id}
              contentFit="cover"
              cachePolicy="memory-disk"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 25,
              }}
            />
          </View>

          <LinearGradient
            {...gradients.primary}
            style={{
              minWidth: 252,
              height: 64,
              borderRadius: 24,
              borderCurve: "continuous",
              paddingHorizontal: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              boxShadow: "0 5px 16px rgba(255,90,100,0.24)",
            }}
          >
            <Text className="font-semibold text-white" size="lg">
              이 사진 구도로 찍기
            </Text>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "white",
              }}
            />
          </LinearGradient>
        </Pressable>
      </Link>
    </View>
  );
}
