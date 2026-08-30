import { MemberGuard } from "@features/user/guard-member";
import { ProfileEditPage } from "@pages/profile/edit";

export default function ProfileEditScreen() {
  return (
    <MemberGuard redirectTo="/profile">
      <ProfileEditPage />
    </MemberGuard>
  );
}
