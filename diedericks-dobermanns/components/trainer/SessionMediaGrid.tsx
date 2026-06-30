import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { uploadSessionPhoto } from '@/lib/trainer/sessionMedia';
import type { DogMedia } from '@/types/app.types';

export function SessionMediaGrid({
  dogId,
  bookingId,
  media,
  refresh,
}: {
  dogId: string;
  bookingId: string;
  media: DogMedia[];
  refresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function handleUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload session photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadSessionPhoto(dogId, bookingId, result.assets[0], setUploadProgress);
      refresh();
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload photo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <View>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {media.map((m) => (
          <View key={m.id} className="h-24 w-24 overflow-hidden rounded-xl bg-surface">
            <Image
              source={{ uri: m.thumbnail_url ?? m.url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
        ))}
        {media.length === 0 && !uploading ? (
          <Typography variant="caption" className="text-silver">
            No session photos yet.
          </Typography>
        ) : null}
      </View>
      {uploading ? (
        <Typography variant="caption" className="mb-2 text-gold">
          Uploading… {uploadProgress}%
        </Typography>
      ) : null}
      <Button label="Upload Photo" variant="outline" onPress={handleUpload} loading={uploading} />
    </View>
  );
}
