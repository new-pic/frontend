import { MemberGuard } from "@features/user/guard-member";
import { FeedEditPage } from "@pages/feed";
import { Redirect, useLocalSearchParams } from "expo-router";

export default function FeedEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) return <Redirect href="/+not-found" />;

  return (
    <MemberGuard redirectTo="/feed">
      <FeedEditPage id={id} isEditMode={!!id} />
    </MemberGuard>
  );
}
