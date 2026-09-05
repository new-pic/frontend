import { decodeAccessToken } from "@shared/lib/jwt";
import { useAuthStore } from "@shared/model";
import { refreshAuthSession } from "./refresh-auth-session";

const ACCESS_TOKEN_EXPIRY_LEEWAY_MS = 30_000;

type AuthenticatedRequest = (accessToken: string) => Promise<Response>;

interface ExecuteAuthenticatedFetchOptions {
  request: AuthenticatedRequest;
  signal?: AbortSignal;
}

function getRequiredAccessToken(): string {
  const accessToken = useAuthStore.getState().accessToken?.trim() ?? "";
  if (!accessToken) throw new Error("로그인이 필요합니다.");
  return accessToken;
}

export async function getFreshAccessToken(): Promise<string> {
  const accessToken = getRequiredAccessToken();
  if (
    !decodeAccessToken.isExpired(
      accessToken,
      Date.now(),
      ACCESS_TOKEN_EXPIRY_LEEWAY_MS,
    )
  ) {
    return accessToken;
  }

  const refreshedSession = await refreshAuthSession();
  return refreshedSession.accessToken;
}

export async function executeAuthenticatedFetch({
  request,
  signal,
}: ExecuteAuthenticatedFetchOptions): Promise<Response> {
  const response = await request(getRequiredAccessToken());
  if (response.status !== 401) return response;

  signal?.throwIfAborted();
  const refreshedSession = await refreshAuthSession();
  signal?.throwIfAborted();

  const retriedResponse = await request(refreshedSession.accessToken);
  if (retriedResponse.status === 401) {
    await useAuthStore.getState().logout();
  }

  return retriedResponse;
}
