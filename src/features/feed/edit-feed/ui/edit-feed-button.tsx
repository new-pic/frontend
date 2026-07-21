import { Button, ButtonIcon } from "@shared/ui";
import { IconPencil } from "@tabler/icons-react-native";
import { router } from "expo-router";

interface EditFeedButtonProps {
  feedId: string;
}

export function EditFeedButton({ feedId }: EditFeedButtonProps) {
  const handlePress = () => {
    router.push({
      pathname: "/feed/edit/[id]",
      params: { id: feedId },
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      accessibilityLabel="피드 수정"
      onPress={handlePress}
    >
      <ButtonIcon as={IconPencil} className="h-5 w-5" />
    </Button>
  );
}
