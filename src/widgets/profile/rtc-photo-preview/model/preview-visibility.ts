interface ProfileRtcPhotoPreviewVisibility {
  isQuerySuccess: boolean;
  hasDisplayablePhoto: boolean;
}

export function shouldShowProfileRtcPhotoPreview({
  isQuerySuccess,
  hasDisplayablePhoto,
}: ProfileRtcPhotoPreviewVisibility) {
  return isQuerySuccess && hasDisplayablePhoto;
}
