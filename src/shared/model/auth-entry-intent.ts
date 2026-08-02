export const AUTH_ENTRY_INTENT = {
  DEFAULT: "DEFAULT",
  LINK_GUEST_ACCOUNT: "LINK_GUEST_ACCOUNT",
} as const;

export type AuthEntryIntent =
  (typeof AUTH_ENTRY_INTENT)[keyof typeof AUTH_ENTRY_INTENT];

export function shouldLeaveAuthEntry(
  accessToken: string | null,
  intent: AuthEntryIntent,
) {
  return Boolean(accessToken) && intent === AUTH_ENTRY_INTENT.DEFAULT;
}
