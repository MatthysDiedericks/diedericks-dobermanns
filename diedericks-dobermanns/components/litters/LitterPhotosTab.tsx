import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useLitterMedia } from '@/hooks/useLitterMedia';
import type { LitterPuppy } from '@/hooks/useLitterWeights';
import { CollarDot } from '@/lib/litters/collarColours';

export function LitterPhotosTab({
  litterId,
  puppies,
}: {
  litterId: string;
  puppies: LitterPuppy[];
}) {
  const { litterPhotos, puppyPhotos, uploadPhoto, deleteMedia } = useLitterMedia(litterId);

  async function pickAndUpload(dogId: string | null) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: !dogId,
      quality: 0.85,
    });
    if (result.canceled) return;
    for (const asset of result.assets) {
      try {
        await uploadPhoto(dogId, asset.uri);
      } catch (e) {
        Alert.alert('Upload failed', e instanceof Error ? e.message : 'Error');
      }
    }
  }

  return (
    <View className="pb-8">
      <Typography variant="label" className="mb-2 text-gold">
        LITTER PHOTOS
      </Typography>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
        <Pressable
          onPress={() => void pickAndUpload(null)}
          className="mr-2 h-20 w-20 items-center justify-center rounded-xl border border-dashed border-gold/40"
        >
          <Typography variant="displayLg" className="text-gold">
            +
          </Typography>
        </Pressable>
        {litterPhotos.map((p) => (
          <Pressable
            key={p.id}
            onLongPress={() =>
              Alert.alert('Delete photo?', '', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => void deleteMedia(p.id, p.storage_path) },
              ])
            }
          >
            <Image source={{ uri: p.public_url }} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }} />
          </Pressable>
        ))}
      </ScrollView>

      <Typography variant="label" className="mb-2 text-gold">
        PUPPY PHOTOS
      </Typography>
      {puppies.map((p, i) => (
        <View key={p.id} className="mb-3 flex-row items-center border-b border-gold/10 pb-3">
          <Typography variant="caption" className="w-6">
            {i + 1}
          </Typography>
          <CollarDot colour={p.collar_colour} />
          <Typography variant="body" className="ml-2 flex-1">
            {p.sex === 'female' ? '♀' : '♂'} {p.name}
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-[180px]">
            {(puppyPhotos.get(p.id) ?? []).map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photo.public_url }}
                style={{ width: 40, height: 40, borderRadius: 6, marginRight: 4 }}
              />
            ))}
            <Pressable
              onPress={() => void pickAndUpload(p.id)}
              className="h-10 w-10 items-center justify-center rounded border border-gold/30"
            >
              <Typography variant="caption">+</Typography>
            </Pressable>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}
