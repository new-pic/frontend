import {
  Avatar,
  AvatarImage,
  Button,
  ButtonIcon,
  ButtonText,
  VStack,
} from "@shared/ui";
import { useAppTranslation } from "@shared/lib";
import { IconCamera, IconUserFilled } from "@tabler/icons-react-native";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import {
  getProfileImagePreviewUri,
  toSelectedProfileImage,
} from "../lib/profile-image-picker-adapter";
import type { SelectedProfileImage } from "../model/profile-edit-form-schema";

interface ProfileImageFieldProps {
  currentImageUrl?: string | null;
  disabled?: boolean;
  value?: SelectedProfileImage;
  onChange: (image: SelectedProfileImage) => void;
}

export function ProfileImageField({
  currentImageUrl,
  disabled = false,
  value,
  onChange,
}: ProfileImageFieldProps) {
  const { t } = useAppTranslation();
  const previewUri = getProfileImagePreviewUri({
    currentImageUrl,
    selectedImage: value,
  });

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled || !result.assets[0]) return;
      onChange(toSelectedProfileImage(result.assets[0]));
    } catch {
      Alert.alert(
        t("profile.imagePickFailedTitle"),
        t("profile.imagePickFailed"),
      );
    }
  };

  return (
    <VStack className="items-center gap-2">
      <Avatar className="h-32 w-32">
        {previewUri ? (
          <AvatarImage source={{ uri: previewUri }} />
        ) : (
          <IconUserFilled size={58} color="white" fill="white" />
        )}
      </Avatar>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11 px-4"
        disabled={disabled}
        onPress={handlePickImage}
        accessibilityLabel={
          previewUri
            ? t("profile.changeImageAccessibility")
            : t("profile.selectImageAccessibility")
        }
      >
        <ButtonIcon as={IconCamera} />
        <ButtonText className="text-link-text">
          {previewUri ? t("profile.changeImage") : t("profile.selectImage")}
        </ButtonText>
      </Button>
    </VStack>
  );
}
