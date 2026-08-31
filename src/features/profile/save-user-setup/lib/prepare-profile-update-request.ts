import { uriToFile } from "@shared/lib";
import type { ProfileEditFormValues } from "../model/profile-edit-form-schema";
import type { ProfileUpdateRequest } from "../model/profile-update-schema";

export async function prepareProfileUpdateRequest(
  values: ProfileEditFormValues,
): Promise<ProfileUpdateRequest> {
  if (!values.profileImageFile) {
    return {
      nickname: values.nickname,
    };
  }

  return {
    nickname: values.nickname,
    profileImageFile: await uriToFile({
      uri: values.profileImageFile.uri,
    }),
  };
}
