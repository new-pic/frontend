import { MemberGuard } from "@features/user/guard-member";
import { FeedEditPage } from "@pages/feed";

export default function FeedCreateScreen() {
  return (
    <MemberGuard redirectTo="/feed">
      <FeedEditPage />
    </MemberGuard>
  );
}
