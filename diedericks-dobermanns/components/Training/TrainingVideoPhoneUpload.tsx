import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { updateVideoFields } from '@/hooks/useTrainingVideos';
import { uploadTrainingFootageFromPhone } from '@/lib/training/phoneUpload';

export function TrainingVideoPhoneUpload({
  videoId,
  onDone,
}: {
  videoId: string;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      setError('Enable photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    setProgress(1);
    try {
      const uploaded = await uploadTrainingFootageFromPhone({
        videoId,
        asset: result.assets[0],
        onProgress: setProgress,
      });
      await updateVideoFields(videoId, {
        video_url: uploaded.videoPath,
        thumbnail_url: uploaded.thumbPath,
        duration_seconds: uploaded.durationSeconds,
      });
      setProgress(null);
      onDone();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed.';
      setError(message);
      setProgress(null);
      Alert.alert('Upload failed', message);
    }
  }

  return (
    <View className="mt-2">
      <Pressable
        onPress={() => void pick()}
        disabled={progress != null}
        className="min-h-[44px] items-center justify-center rounded-lg border border-gold/40 px-3 py-3"
      >
        <Typography variant="caption" className="text-gold">
          {progress != null ? `Uploading ${progress}%` : 'Upload from phone'}
        </Typography>
      </Pressable>
      {error ? (
        <Typography variant="caption" className="mt-1 text-danger">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
