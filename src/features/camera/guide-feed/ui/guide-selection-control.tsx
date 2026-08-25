import { colors } from "@shared/ui/theme";
import { Text } from "@shared/ui";
import { IconEye, IconEyeOff } from "@tabler/icons-react-native";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  View,
} from "react-native";
import type { GuideFeedSelection } from "../model";

interface GuideSelectionControlProps {
  selectedGuide: GuideFeedSelection | null;
  isPreparing: boolean;
  hasError: boolean;
  isReferenceVisible: boolean;
  isReferenceAvailable: boolean;
  topOffset?: number;
  onOpen: () => void;
  onRetry: () => void;
  onToggleReference: () => void;
}

export function GuideSelectionControl({
  selectedGuide,
  isPreparing,
  hasError,
  isReferenceVisible,
  isReferenceAvailable,
  topOffset = 64,
  onOpen,
  onRetry,
  onToggleReference,
}: GuideSelectionControlProps) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 12,
      }}
    >
      {hasError ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="촬영 가이드 다시 불러오기"
          onPress={onRetry}
          style={{
            position: "absolute",
            right: 12,
            top: topOffset + 56,
            borderRadius: 16,
            backgroundColor: "rgba(0,0,0,0.72)",
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text className="text-xs text-white">
            가이드 오류 · 다시 시도
          </Text>
        </Pressable>
      ) : null}

      {selectedGuide ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="원본 가이드 이미지 표시"
          accessibilityState={{
            checked: isReferenceVisible,
            disabled: !isReferenceAvailable,
          }}
          disabled={!isReferenceAvailable}
          onPress={onToggleReference}
          style={({ pressed }) => ({
            position: "absolute",
            left: 12,
            top: topOffset,
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: isReferenceVisible
              ? colors.brand.primary
              : "rgba(255,255,255,0.8)",
            backgroundColor: "rgba(0,0,0,0.62)",
            alignItems: "center",
            justifyContent: "center",
            opacity: !isReferenceAvailable
              ? 0.45
              : pressed
                ? 0.72
                : 1,
          })}
        >
          {isReferenceVisible ? (
            <IconEye size={26} color="white" strokeWidth={2.2} />
          ) : (
            <IconEyeOff size={26} color="white" strokeWidth={2.2} />
          )}
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          selectedGuide
            ? "선택한 촬영 가이드 변경"
            : "촬영 가이드 선택"
        }
        accessibilityState={{ selected: Boolean(selectedGuide) }}
        onPress={onOpen}
        style={{
          position: "absolute",
          right: 12,
          top: topOffset,
          width: selectedGuide ? 48 : undefined,
          height: 48,
          borderRadius: 24,
          borderWidth: selectedGuide ? 2 : 1,
          borderColor: selectedGuide
            ? colors.brand.primary
            : "rgba(255,255,255,0.8)",
          backgroundColor: "rgba(0,0,0,0.62)",
          paddingHorizontal: selectedGuide ? 3 : 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {selectedGuide ? (
          <Image
            source={selectedGuide.thumbnailUrl}
            recyclingKey={selectedGuide.feedId}
            contentFit="cover"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
            }}
          />
        ) : null}
        {isPreparing ? (
          <ActivityIndicator
            size="small"
            color="white"
            style={
              selectedGuide
                ? {
                    position: "absolute",
                    top: 12,
                    left: 12,
                  }
                : undefined
            }
          />
        ) : (
          !selectedGuide && (
            <Text className="font-semibold text-xs text-white">
              가이드 선택
            </Text>
          )
        )}
      </Pressable>
    </View>
  );
}
