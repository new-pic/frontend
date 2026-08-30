import { feedQueryKeys } from "@entities/feed";

export const feedTagQueryKeys = {
  search: (keyword?: string) =>
    [...feedQueryKeys.all, "tags", keyword] as const,
} as const;
