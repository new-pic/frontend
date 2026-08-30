import { userQueryKeys, type PaginationParams } from "@entities/user";

export const blockedUsersPageQueryKeys = {
  blockedUserList: (userId: string | null, params: PaginationParams) =>
    [...userQueryKeys.blockLists(), userId, params] as const,
} as const;
