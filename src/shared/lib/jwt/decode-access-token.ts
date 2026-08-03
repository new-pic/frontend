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

export const decodeAccessToken = {
  userId: decodeUserId,
  userType: decodeUserType,
};
