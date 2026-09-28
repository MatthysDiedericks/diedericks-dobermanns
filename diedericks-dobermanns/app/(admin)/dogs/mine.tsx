import { DogsDirectoryScreen } from '@/components/dogs/DogsDirectoryScreen';

/** Same dogs screen as the index, opened on My dogs. Matches /admin/dogs/mine. */
export default function MyDogsRoute() {
  return (
    <DogsDirectoryScreen
      detailRoute={(id) => `/(admin)/dogs/${id}`}
      headerEyebrow="Kennel"
      headerTitle="Dogs"
      showUnallocatedBanner
      initialFilter="mine"
    />
  );
}
