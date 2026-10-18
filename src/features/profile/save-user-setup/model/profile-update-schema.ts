import { File } from "expo-file-system";
import { z } from "zod";
import { translate } from "../../../../shared/config";

export const NicknameSchema = z
  .string()
  .min(1, { error: () => translate("profile.nicknameMinimum") })
  .max(8, { error: () => translate("profile.nicknameMaximum") });

export const UpdateProfileRequestSchema = z.object({
  nickname: NicknameSchema,
  profileImageFile: z.instanceof(File).optional(),
});

export type ProfileUpdateRequest = z.infer<typeof UpdateProfileRequestSchema>;
