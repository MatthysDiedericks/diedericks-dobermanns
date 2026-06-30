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

interface PhotoUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (
    assets: ImagePicker.ImagePickerAsset[],
    onProgress: (pct: number) => void,
  ) => Promise<void>;
}

export function PhotoUploadSheet({ visible, onClose, onUpload }: PhotoUploadSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['60%'], []);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
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
      setError('Permission denied. Enable camera or photo access in Settings.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 10,
            quality: 1,
          });

    if (result.canceled || !result.assets.length) return;

    setUploading(true);
    setProgress(0);
    try {
      await onUpload(result.assets, setProgress);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
      setProgress(0);
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
          Add Photos
        </Typography>
        <Typography variant="caption" className="mt-1 text-muted">
          Up to 10 photos per batch. Images are compressed before upload.
        </Typography>

        {uploading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator color={Colors.gold} size="large" />
            <Typography variant="label" className="mt-4">
              Uploading… {progress}%
            </Typography>
            <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black-rich">
              <View className="h-full bg-gold" style={{ width: `${progress}%` }} />
            </View>
          </View>
        ) : (
          <View className="mt-8 gap-3">
            <Button label="Take Photo" variant="solid" onPress={() => void pick('camera')} fullWidth />
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
