export const AUTH_SESSION_STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
} as const;

type AuthSessionStorageKey =
  (typeof AUTH_SESSION_STORAGE_KEYS)[keyof typeof AUTH_SESSION_STORAGE_KEYS];

type DeleteStoredValue = (key: AuthSessionStorageKey) => Promise<void>;

interface AuthSessionStorageCleanupResult {
  failedKeys: AuthSessionStorageKey[];
}

export async function clearPersistedAuthSession(
  deleteStoredValue: DeleteStoredValue,
): Promise<AuthSessionStorageCleanupResult> {
  const keys = Object.values(AUTH_SESSION_STORAGE_KEYS);
  const results = await Promise.allSettled(
    keys.map((key) =>
      Promise.resolve().then(() => deleteStoredValue(key)),
    ),
  );

  return {
    failedKeys: results.flatMap((result, index) =>
      result.status === "rejected" ? [keys[index]] : [],
    ),
  };
}
