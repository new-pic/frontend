import { MemberGuard } from "@features/user/guard-member";
import { ProfileBlockedUsersPage } from "@pages/profile";

export default function ProfileBlockedUsersScreen() {
  return (
    <MemberGuard redirectTo="/profile">
      <ProfileBlockedUsersPage />
    </MemberGuard>
  );
}
