export const userQueryKeys = {
  all: ["user"] as const,
  me: (userId: string | null) => [...userQueryKeys.all, "me", userId] as const,
  blockLists: () => [...userQueryKeys.all, "blocks", "list"] as const,
} as const;
