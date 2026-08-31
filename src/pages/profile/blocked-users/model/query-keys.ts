import { userQueryKeys } from "@entities/user";
import type { BlockedUserListParams } from "./blocked-user-list";

export const blockedUsersPageQueryKeys = {
  blockedUserList: (userId: string | null, params: BlockedUserListParams) =>
    [...userQueryKeys.blockLists(), userId, params] as const,
} as const;
