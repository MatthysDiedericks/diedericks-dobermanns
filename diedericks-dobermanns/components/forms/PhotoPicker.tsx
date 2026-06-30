import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface PhotoPickerProps {
  value: string[];
  onChange: (uris: string[]) => void;
  max?: number;
}

/**
 * Lets a user pick up to `max` images from their library. Returns local URIs;
 * callers upload them (see resolvePhotoUrls) on submit. Works on web + native.
 */
export function PhotoPicker({ value, onChange, max = 3 }: PhotoPickerProps) {
  const remaining = max - value.length;

  // iPhone/Android can open the camera; web falls back to the library picker.
  const canUseCamera = Platform.OS !== 'web';

  async function pickFromLibrary() {
    if (remaining <= 0) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    // quality < 1 re-encodes iPhone HEIC photos to JPEG on capture/selection.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri).slice(0, remaining);
    onChange([...value, ...uris]);
  }

  async function takePhoto() {
    if (remaining <= 0) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (uri) onChange([...value, uri].slice(0, max));
  }

  function remove(uri: string) {
    onChange(value.filter((u) => u !== uri));
  }

  return (
    <View>
      <View className="flex-row flex-wrap gap-3">
        {value.map((uri) => (
          <View key={uri} className="h-24 w-24 overflow-hidden rounded-xl border border-gold/20 bg-surface">
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            <Pressable
              onPress={() => remove(uri)}
              hitSlop={8}
              className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/70"
            >
              <Ionicons name="close" size={14} color={Colors.gold} />
            </Pressable>
          </View>
        ))}

        {remaining > 0 ? (
          <>
            {canUseCamera ? (
              <Pressable
                onPress={takePhoto}
                className="h-24 w-24 items-center justify-center rounded-xl border border-dashed border-gold/30 bg-black-rich"
              >
                <Ionicons name="camera" size={20} color={Colors.gold} />
                <Typography variant="caption" className="mt-1 text-gold">
                  Take photo
                </Typography>
              </Pressable>
            ) : null}
            <Pressable
              onPress={pickFromLibrary}
              className="h-24 w-24 items-center justify-center rounded-xl border border-dashed border-gold/30 bg-black-rich"
            >
              <Ionicons name="images" size={20} color={Colors.gold} />
              <Typography variant="caption" className="mt-1 text-gold">
                {canUseCamera ? 'Library' : 'Add photos'}
              </Typography>
            </Pressable>
          </>
        ) : null}
      </View>
      <Typography variant="caption" className="mt-2 text-silver">
        {value.length}/{max} photos
      </Typography>
    </View>
  );
}
