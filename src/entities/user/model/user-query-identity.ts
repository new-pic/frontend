export function getUserQueryIdentity(userId: string | null) {
  return userId ?? "anonymous";
}
