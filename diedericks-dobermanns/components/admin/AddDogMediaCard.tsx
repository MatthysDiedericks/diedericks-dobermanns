import { useState } from 'react';
import { View } from 'react-native';

import { DogGroupPickerField, type DogPickerOption } from '@/components/forms/DogGroupPickerField';
import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { addDogMedia, useSubmitting } from '@/hooks/useMutations';
import { resolvePhotoUrls } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';

/**
 * Lets staff attach a photo to a specific dog from the media screen, instead
 * of navigating into that dog's own profile first. Mirrors the web gallery
 * uploader's "A specific dog" destination.
 */
export function AddDogMediaCard({
  dogs,
  dogId,
  onDogIdChange,
  onUploaded,
}: {
  dogs: DogPickerOption[];
  dogId: string | null;
  onDogIdChange: (id: string | null) => void;
  onUploaded?: () => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const { submitting, run } = useSubmitting();
  const [isPublic, setIsPublic] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = !!dogId && photos.length > 0;

  async function submit() {
    setError(null);
    setSuccess(null);
    if (!dogId || photos.length === 0) {
      setError('Choose a dog and at least one photo.');
      return;
    }
    const urls = await resolvePhotoUrls(photos, `dogs/${dogId}`);
    for (let i = 0; i < urls.length; i++) {
      const uri = photos[i];
      const { error: err } = await run(() =>
        addDogMedia({
          dogId,
          type: 'photo',
          url: urls[i],
          isPublic,
          uploadedBy: profile?.id ?? null,
          caption: captions[uri]?.trim() || null,
        }),
      );
      if (err) {
        setError(err);
        return;
      }
    }
    setPhotos([]);
    setCaptions({});
    setSuccess(
      isPublic
        ? `Added ${urls.length} photo${urls.length === 1 ? '' : 's'} — now visible on the dog's public profile.`
        : `Added ${urls.length} photo${urls.length === 1 ? '' : 's'} — kept private, in the review queue.`,
    );
    onUploaded?.();
  }

  return (
    <View className="mb-6 rounded-2xl border border-gold/20 bg-surface p-4">
      <Typography variant="subtitle" className="mb-3 text-gold">
        Add Photo to a Dog
      </Typography>

      <DogGroupPickerField
        label="Dog — upload target and what you are looking at"
        value={dogId}
        onChange={onDogIdChange}
        dogs={dogs}
        placeholder="Choose a dog…"
      />

      <View className="mb-4">
        <Checkbox checked={isPublic} onChange={setIsPublic} label="Also show on the public website" />
      </View>

      <Typography variant="caption" className="mb-2 text-silver">
        Photos
      </Typography>
      <PhotoPicker
        value={photos}
        onChange={(next) => {
          setPhotos(next);
          setCaptions((prev) => {
            const keep: Record<string, string> = {};
            for (const uri of next) {
              if (prev[uri]) keep[uri] = prev[uri];
            }
            return keep;
          });
        }}
        max={5}
      />
      {photos.map((uri, i) => (
        <Input
          key={uri}
          label={photos.length > 1 ? `Caption · photo ${i + 1}` : 'Caption'}
          value={captions[uri] ?? ''}
          onChangeText={(text) => setCaptions((prev) => ({ ...prev, [uri]: text }))}
          placeholder="Hunter-King, PSA trial, March 2026"
        />
      ))}

      {error ? (
        <Typography variant="caption" className="mt-3 text-danger">
          {error}
        </Typography>
      ) : null}
      {success ? (
        <Typography variant="caption" className="mt-3 text-gold">
          {success}
        </Typography>
      ) : null}

      <Button label="Upload" onPress={submit} loading={submitting} disabled={!canSubmit} fullWidth className="mt-4" />
    </View>
  );
}
