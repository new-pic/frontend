import type { ProfileRequest } from "@entities/user";
import { uriToFile } from "@shared/lib";
import type { ProfileEditFormValues } from "../model/profile-edit-form-schema";

export async function prepareProfileUpdateRequest(
  values: ProfileEditFormValues,
): Promise<ProfileRequest> {
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
