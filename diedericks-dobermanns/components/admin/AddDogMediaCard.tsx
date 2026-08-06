import { useState } from 'react';
import { View } from 'react-native';

import { DogGroupPickerField, type DogPickerOption } from '@/components/forms/DogGroupPickerField';
import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Typography } from '@/components/ui/Typography';
import { addDogMedia, useSubmitting } from '@/hooks/useMutations';
import { resolvePhotoUrls } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';

/**
 * Lets staff attach a photo to a specific dog from the media screen, instead
 * of navigating into that dog's own profile first. Mirrors the web gallery
 * uploader's "A specific dog" destination.
 */
export function AddDogMediaCard({ dogs }: { dogs: DogPickerOption[] }) {
  const profile = useAuthStore((s) => s.profile);
  const { submitting, run } = useSubmitting();
  const [dogId, setDogId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
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
    for (const url of urls) {
      const { error: err } = await run(() =>
        addDogMedia({ dogId, type: 'photo', url, isPublic, uploadedBy: profile?.id ?? null }),
      );
      if (err) {
        setError(err);
        return;
      }
    }
    setPhotos([]);
    setSuccess(
      isPublic
        ? `Added ${urls.length} photo${urls.length === 1 ? '' : 's'} — now visible on the dog's public profile.`
        : `Added ${urls.length} photo${urls.length === 1 ? '' : 's'} — kept private, in the review queue.`,
    );
  }

  return (
    <View className="mb-6 rounded-2xl border border-gold/20 bg-surface p-4">
      <Typography variant="subtitle" className="mb-3 text-gold">
        Add Photo to a Dog
      </Typography>

      <DogGroupPickerField label="Dog" value={dogId} onChange={setDogId} dogs={dogs} placeholder="Choose a dog…" />

      <View className="mb-4">
        <Checkbox checked={isPublic} onChange={setIsPublic} label="Also show on the public website" />
      </View>

      <Typography variant="caption" className="mb-2 text-silver">
        Photos
      </Typography>
      <PhotoPicker value={photos} onChange={setPhotos} max={5} />

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
