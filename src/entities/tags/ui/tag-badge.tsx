import { Badge, BadgeIcon, BadgeText, Pressable } from "@shared/ui";
import { IconX } from "@tabler/icons-react-native";

interface TagBadgeProps {
  tag: string;
  removable?: boolean;
  onPress?: () => void;
}

export function TagBadge({ tag, removable, onPress }: TagBadgeProps) {
  return (
    <Pressable onPress={onPress}>
      <Badge>
        <BadgeText>#{tag}</BadgeText>

        {removable && <BadgeIcon as={IconX} color="white" />}
      </Badge>
    </Pressable>
  );
}
