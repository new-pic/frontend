import { NicknameSchema } from "@entities/user";
import { z } from "zod";

export const SelectedProfileImageSchema = z.object({
  uri: z.string().min(1),
  fileName: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
});

export const ProfileEditFormSchema = z.object({
  nickname: NicknameSchema,
  profileImageFile: SelectedProfileImageSchema.optional(),
});

export type ProfileEditFormValues = z.infer<typeof ProfileEditFormSchema>;

export type SelectedProfileImage = z.infer<typeof SelectedProfileImageSchema>;
