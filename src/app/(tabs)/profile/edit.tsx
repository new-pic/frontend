import { MemberGuard } from "@features/user/guard-member";
import { ProfileEditPage } from "@pages/profile";

export default function ProfileEditScreen() {
  return (
    <MemberGuard redirectTo="/profile">
      <ProfileEditPage />
    </MemberGuard>
  );
}
