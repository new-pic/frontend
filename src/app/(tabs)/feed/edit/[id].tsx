import { FeedEditPage } from "@pages/feed";
import { router, useLocalSearchParams } from "expo-router";

export default function FeedEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  console.log("FeedEditScreen", id);

  if (!id) router.replace("/+not-found");

  return <FeedEditPage id={id} isEditMode={!!id} />;
}
