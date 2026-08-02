import { HStack, Skeleton, SkeletonText, VStack } from "@shared/ui";
import { SafeAreaView } from "react-native-safe-area-context";

const skeletonColor = "bg-outline-light";

export function FeedDetailSkeleton() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <VStack className="pt-3 w-full">
        <VStack className="px-6 items-start border-b border-outline-light">
          <HStack className="w-full h-10 items-center justify-between">
            <Skeleton
              variant="rounded"
              startColor={skeletonColor}
              className="w-10 h-10"
            />
          </HStack>

          <HStack className="items-center justify-between w-full py-2">
            <HStack space="md" className="items-center px-1 py-2">
              <Skeleton
                variant="circular"
                startColor={skeletonColor}
                className="h-8 w-8"
              />
              <Skeleton startColor={skeletonColor} className="h-4 w-24" />
            </HStack>
            <Skeleton
              variant="rounded"
              startColor={skeletonColor}
              className="h-8 w-8"
            />
          </HStack>
        </VStack>

        <Skeleton
          variant="sharp"
          startColor={skeletonColor}
          className="w-full h-110"
        />

        <HStack className="px-6 py-2 h-10 border-t border-b justify-between border-outline-light">
          <HStack className="items-center" space="xs">
            <Skeleton
              variant="circular"
              startColor={skeletonColor}
              className="h-5 w-5"
            />
            <Skeleton startColor={skeletonColor} className="h-4 w-10" />
          </HStack>
          <Skeleton
            variant="rounded"
            startColor={skeletonColor}
            className="h-5 w-5"
          />
        </HStack>

        <VStack className="px-6 py-4" space="md">
          <SkeletonText startColor={skeletonColor} className="h-4 w-40" />
          <SkeletonText startColor={skeletonColor} className="h-4 w-full" />
          <SkeletonText startColor={skeletonColor} className="h-4 w-2/3" />
        </VStack>
      </VStack>
    </SafeAreaView>
  );
}
