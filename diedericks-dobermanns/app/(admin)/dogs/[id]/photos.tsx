import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminVideoList } from '@/components/dogs/AdminVideoList';
import { PhotoGrid } from '@/components/dogs/PhotoGrid';
import { PhotoUploadSheet } from '@/components/dogs/PhotoUploadSheet';
import { VideoUploadSheet } from '@/components/dogs/VideoUploadSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDogMedia } from '@/hooks/useDogMedia';
import { useDogVideos } from '@/hooks/useDogVideos';
import { useDog } from '@/hooks/useDogs';

export default function DogPhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { dog, loading: dogLoading } = useDog(id);
  const {
    media,
    loading: photosLoading,
    error: photosError,
    refresh: refreshPhotos,
    uploadPhotos,
    deletePhoto,
    setPrimary,
    updateCaption,
    reorderPhotos,
  } = useDogMedia(id ?? '');
  const {
    videos,
    loading: videosLoading,
    error: videosError,
    refresh: refreshVideos,
    uploadVideo,
    deleteVideo,
    updateCaption: updateVideoCaption,
  } = useDogVideos(id ?? '');
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [videoSheetOpen, setVideoSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loading = photosLoading || videosLoading;
  const error = photosError ?? videosError;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refreshPhotos(), refreshVideos()]);
    setRefreshing(false);
  }

  if (dogLoading || (loading && !media.length && !videos.length)) {
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
        <PageHeader eyebrow={dog?.name ?? 'Dog'} title="Photos & Videos" back />
        <View className="mb-4 px-6">
          <Badge label={`${media.length} photo${media.length === 1 ? '' : 's'}`} tone="gold" />
        </View>
        <View className="px-4 pb-36">
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

          <AdminVideoList
            videos={videos}
            onDelete={deleteVideo}
            onUpdateCaption={updateVideoCaption}
          />
        </View>
      </ScreenContainer>

      <Pressable
        onPress={() => setVideoSheetOpen(true)}
        style={{ bottom: insets.bottom + 88 }}
        className="absolute right-6 flex-row items-center gap-2 rounded-full border border-gold bg-surface px-5 py-3"
      >
        <Ionicons name="videocam" size={20} color={Colors.gold} />
        <Typography variant="label" className="text-gold">
          Add Video
        </Typography>
      </Pressable>

      <Pressable
        onPress={() => setPhotoSheetOpen(true)}
        style={{ bottom: insets.bottom + 24 }}
        className="absolute right-6 flex-row items-center gap-2 rounded-full bg-gold px-5 py-3 shadow-lg"
      >
        <Ionicons name="add" size={22} color={Colors.black} />
        <Typography variant="label" className="text-black">
          Add Photos
        </Typography>
      </Pressable>

      <PhotoUploadSheet
        visible={photoSheetOpen}
        onClose={() => setPhotoSheetOpen(false)}
        onUpload={uploadPhotos}
      />
      <VideoUploadSheet
        visible={videoSheetOpen}
        onClose={() => setVideoSheetOpen(false)}
        onUpload={uploadVideo}
      />
    </>
  );
}
