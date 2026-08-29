import {
  Avatar,
  AvatarImage,
  Button,
  ButtonIcon,
  ButtonText,
  VStack,
} from "@shared/ui";
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
        "사진 선택 실패",
        "프로필 사진을 선택하지 못했습니다. 다시 시도해주세요.",
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
          previewUri ? "프로필 사진 변경" : "프로필 사진 선택"
        }
      >
        <ButtonIcon as={IconCamera} />
        <ButtonText className="text-link-text">
          {previewUri ? "사진 변경" : "사진 선택"}
        </ButtonText>
      </Button>
    </VStack>
  );
}
