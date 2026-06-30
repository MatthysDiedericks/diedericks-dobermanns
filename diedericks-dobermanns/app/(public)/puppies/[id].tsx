import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Puppies are dogs in the `puppy` category, so a puppy profile reuses the
 * canonical dog profile screen. This route simply forwards there.
 */
export default function PuppyProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/dogs/${id}`} />;
}
