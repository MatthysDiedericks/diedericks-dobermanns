import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  className?: string;
}

/** A single shimmering placeholder block. */
export function Skeleton({ className }: SkeletonProps) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.75, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={style} className={`rounded-xl bg-surface ${className ?? ''}`} />;
}

/** Skeleton placeholder mirroring a full-width DogCard. */
export function DogCardSkeleton() {
  return (
    <View className="overflow-hidden rounded-2xl border border-gold/15 bg-black-rich">
      <Skeleton className="h-48 w-full rounded-none" />
      <View className="p-4">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="mt-2 h-3 w-3/4" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </View>
    </View>
  );
}

interface ListSkeletonProps {
  /** Number of placeholder rows to render. */
  count?: number;
}

/** Vertical stack of simple card-row skeletons for list screens. */
export function CardListSkeleton({ count = 4 }: ListSkeletonProps) {
  return (
    <View className="gap-3 px-6">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="flex-row items-center rounded-2xl border border-gold/15 bg-black-rich p-4"
        >
          <Skeleton className="h-14 w-14 rounded-xl" />
          <View className="ml-4 flex-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Grid of DogCard skeletons. */
export function DogGridSkeleton({ count = 4 }: ListSkeletonProps) {
  return (
    <View className="gap-4 px-6">
      {Array.from({ length: count }).map((_, i) => (
        <DogCardSkeleton key={i} />
      ))}
    </View>
  );
}
