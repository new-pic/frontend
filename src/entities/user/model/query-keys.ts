import type { PaginationParams } from "./models";

export const userQueryKeys = {
  all: ["user"] as const,
  me: (userId: string | null) => [...userQueryKeys.all, "me", userId] as const,
  blockLists: () => [...userQueryKeys.all, "blocks", "list"] as const,
  blockList: (userId: string | null, params: PaginationParams) =>
    [...userQueryKeys.blockLists(), userId, params] as const,
} as const;
