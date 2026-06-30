import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoGrid } from '@/components/dogs/PhotoGrid';
import { PhotoUploadSheet } from '@/components/dogs/PhotoUploadSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDogMedia } from '@/hooks/useDogMedia';
import { useDog } from '@/hooks/useDogs';

export default function DogPhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { dog, loading: dogLoading } = useDog(id);
  const {
    media,
    loading,
    error,
    refresh,
    uploadPhotos,
    deletePhoto,
    setPrimary,
    updateCaption,
    reorderPhotos,
  } = useDogMedia(id ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (dogLoading || (loading && !media.length)) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  return (
    <>
      <ScreenContainer
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Colors.gold} />
        }
      >
        <PageHeader eyebrow={dog?.name ?? 'Dog'} title="Photos" back />
        <View className="mb-4 px-6">
          <Badge
            label={`${media.length} photo${media.length === 1 ? '' : 's'}`}
            tone="gold"
          />
        </View>
        <View className="px-4 pb-28">
          {error ? (
            <Typography variant="caption" className="mb-4 text-danger">
              {error}
            </Typography>
          ) : null}
          <PhotoGrid
            media={media}
            onSetPrimary={setPrimary}
            onDelete={deletePhoto}
            onUpdateCaption={updateCaption}
            onReorder={reorderPhotos}
          />
          <Typography variant="caption" className="mt-4 text-center text-muted">
            Long-press a photo for options. Use Move Earlier / Later to reorder.
          </Typography>
        </View>
      </ScreenContainer>

      <Pressable
        onPress={() => setSheetOpen(true)}
        style={{ bottom: insets.bottom + 24 }}
        className="absolute right-6 flex-row items-center gap-2 rounded-full bg-gold px-5 py-3 shadow-lg"
      >
        <Ionicons name="add" size={22} color={Colors.black} />
        <Typography variant="label" className="text-black">
          Add Photos
        </Typography>
      </Pressable>

      <PhotoUploadSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpload={uploadPhotos}
      />
    </>
  );
}
