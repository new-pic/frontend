import { MemberGuard } from "@features/user/guard-member";
import { ProfileBlockedUsersPage } from "@pages/profile/blocked-users";

export default function ProfileBlockedUsersScreen() {
  return (
    <MemberGuard redirectTo="/profile">
      <ProfileBlockedUsersPage />
    </MemberGuard>
  );
}
