import type { ImagePickerAsset } from "expo-image-picker";
import type { SelectedProfileImage } from "../model/profile-edit-form-schema";

export function toSelectedProfileImage(
  asset: ImagePickerAsset,
): SelectedProfileImage {
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? undefined,
    mimeType: asset.mimeType ?? undefined,
  };
}

export function getProfileImagePreviewUri({
  currentImageUrl,
  selectedImage,
}: {
  currentImageUrl?: string | null;
  selectedImage?: SelectedProfileImage;
}) {
  return selectedImage?.uri ?? currentImageUrl ?? undefined;
}
