import { useAuthStore } from "@shared/model";
import { Spinner } from "@shared/ui";
import { Href, Redirect } from "expo-router";
import { PropsWithChildren } from "react";

interface MemberGuardProps extends PropsWithChildren {
  redirectTo: Href;
}

export function MemberGuard({ children, redirectTo }: MemberGuardProps) {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isGuest = useAuthStore((state) => state.isGuest);

  // 인증 초기화 전에 회원 전용 화면이 잠깐 노출되는 것 방지
  if (!isInitialized) {
    return <Spinner />;
  }

  if (!accessToken || isGuest) {
    return <Redirect href={redirectTo} />;
  }

  return children;
}
