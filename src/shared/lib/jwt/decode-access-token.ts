import { jwtDecode } from "jwt-decode";

type UserType = "USER" | "GUEST" | "ADMIN";

interface DecodedToken {
  sub: string;
  email: string;
  userType: UserType;
  iat: number;
  exp: number;
}

const decodeUserId = (token: string): string | null => {
  try {
    const decodedToken = jwtDecode<DecodedToken>(token);
    return decodedToken.sub;
  } catch {
    return null;
  }
};

const decodeUserType = (token: string): UserType | null => {
  try {
    const decodedToken = jwtDecode<DecodedToken>(token);
    return decodedToken.userType;
  } catch {
    return "USER";
  }
};

const isExpired = (
  token: string,
  nowMs = Date.now(),
  leewayMs = 0,
): boolean => {
  try {
    const decodedToken = jwtDecode<DecodedToken>(token);
    if (!Number.isFinite(decodedToken.exp)) return true;

    return decodedToken.exp * 1_000 <= nowMs + Math.max(0, leewayMs);
  } catch {
    return true;
  }
};

export const decodeAccessToken = {
  userId: decodeUserId,
  userType: decodeUserType,
  isExpired,
};
