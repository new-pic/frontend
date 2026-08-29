import * as Haptics from "expo-haptics";

export async function triggerFeedCompletionHaptic() {
  try {
    if (process.env.EXPO_OS === "android") {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // 햅틱 지원 여부가 피드 게시 결과에 영향을 주지 않게 합니다.
  }
}
