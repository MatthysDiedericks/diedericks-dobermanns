import { DogsDirectoryScreen } from '@/components/dogs/DogsDirectoryScreen';

export default function DogsScreen() {
  return (
    <DogsDirectoryScreen
      detailRoute={(id) => `/(admin)/dogs/${id}`}
      headerEyebrow="Kennel"
      headerTitle="Dogs"
    />
  );
}
