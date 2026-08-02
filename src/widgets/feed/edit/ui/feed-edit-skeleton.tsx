import { HStack, Skeleton, SkeletonText, VStack } from "@shared/ui";
import { SafeAreaView } from "react-native-safe-area-context";

const skeletonColor = "bg-outline-light";

export function FeedEditSkeleton() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <VStack className="h-full pt-3 w-full" space="xl">
        <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
          <Skeleton
            variant="rounded"
            startColor={skeletonColor}
            className="w-12 h-12"
          />
          <Skeleton startColor={skeletonColor} className="w-24 h-5" />
          <VStack className="w-12" />
        </HStack>
        <VStack className="items-center">
          <Skeleton
            variant="rounded"
            startColor={skeletonColor}
            className="w-3/5 h-72"
          />
        </VStack>
        <VStack className="flex-1 px-8 pt-6" space="lg">
          <SkeletonText startColor={skeletonColor} className="h-5 w-full" />
          <SkeletonText startColor={skeletonColor} className="h-5 w-4/5" />
          <Skeleton startColor={skeletonColor} className="h-12 w-full mt-auto mb-4" />
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
