import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { VideoUploadStatus } from '@/hooks/useDogVideos';

interface VideoUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (
    asset: ImagePicker.ImagePickerAsset,
    onStatusChange: (status: VideoUploadStatus) => void,
  ) => Promise<void>;
}

export function VideoUploadSheet({ visible, onClose, onUpload }: VideoUploadSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['55%'], []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (!uploading) onClose();
  }, [onClose, uploading]);

  async function pick(source: 'camera' | 'library') {
    setError(null);
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      setError('Permission denied. Enable camera or media access in Settings.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'] })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsMultipleSelection: false,
            selectionLimit: 1,
          });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      await onUpload(result.assets[0], (status) => {
        if (status === 'uploading') setUploading(true);
        if (status === 'done' || status === 'idle') setUploading(false);
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      enablePanDownToClose={!uploading}
      backgroundStyle={{ backgroundColor: '#1C1A0E' }}
      handleIndicatorStyle={{ backgroundColor: '#C4A35A' }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}>
        <Typography variant="subtitle" className="text-gold">
          Add Video
        </Typography>
        <Typography variant="caption" className="mt-1 text-muted">
          One video at a time. Maximum size 200MB.
        </Typography>

        {uploading ? (
          <View className="mt-10 items-center px-4">
            <ActivityIndicator color={Colors.gold} size="large" />
            <Typography variant="label" className="mt-4 text-center">
              Uploading video… this can take a minute
            </Typography>
          </View>
        ) : (
          <View className="mt-8 gap-3">
            <Button label="Record Video" variant="solid" onPress={() => void pick('camera')} fullWidth />
            <Button
              label="Choose from Library"
              variant="outline"
              onPress={() => void pick('library')}
              fullWidth
            />
          </View>
        )}

        {error ? (
          <Typography variant="caption" className="mt-4 text-danger">
            {error}
          </Typography>
        ) : null}

        {!uploading ? (
          <Pressable onPress={onClose} className="mt-6 items-center">
            <Typography variant="label">Cancel</Typography>
          </Pressable>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
