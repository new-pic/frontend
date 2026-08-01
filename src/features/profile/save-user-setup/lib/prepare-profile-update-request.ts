import type { ProfileRequest } from "@entities/user";
import { uriToFile } from "@shared/lib";
import type { ProfileEditFormValues } from "../model/profile-edit-form-schema";

export async function prepareProfileUpdateRequest(
  values: ProfileEditFormValues,
): Promise<ProfileRequest> {
  if (!values.profileImage) {
    return {
      nickname: values.nickname,
    };
  }

  return {
    nickname: values.nickname,
    profileImage: await uriToFile({
      uri: values.profileImage.uri,
    }),
  };
}
