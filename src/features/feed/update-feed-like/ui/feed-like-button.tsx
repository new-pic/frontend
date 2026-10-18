import { colors } from "@shared/ui/theme";
import { useAppTranslation } from "@shared/lib";
import { Button, ButtonIcon } from "@shared/ui";
import { IconHeartFilled } from "@tabler/icons-react-native";

interface FeedLikeButtonProps {
  isLiked: boolean;
  isPending: boolean;
  tone?: "default" | "on-image";
  onPress: () => void;
}

export function FeedLikeButton({
  isLiked,
  isPending,
  tone = "default",
  onPress,
}: FeedLikeButtonProps) {
  const { t } = useAppTranslation();
  const isOnImage = tone === "on-image";
  const iconColor = isOnImage ? "white" : colors.brand.primary;
  const iconFill = isLiked
    ? colors.brand.primary
    : isOnImage
      ? "transparent"
      : "white";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      disabled={isPending}
      accessibilityLabel={isLiked ? t("feed.unlike") : t("feed.like")}
      onPress={onPress}
    >
      <ButtonIcon
        className={isOnImage ? "w-8 h-8" : "w-7 h-7"}
        as={IconHeartFilled}
        color={iconColor}
        fill={iconFill}
      />
    </Button>
  );
}
