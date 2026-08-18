import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { ThumbImage } from '@/components/media/ThumbImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useDogMedia } from '@/hooks/useDogMedia';
import { addDogMedia, useSubmitting } from '@/hooks/useMutations';
import { resolvePhotoUrls } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';

/**
 * A client adding their own photos of a dog they own — inserts into
 * dog_media (not dog_timeline). is_public is always forced false here; the
 * consent tick only records whether the owner would allow a future publish,
 * which staff act on from the admin review queue.
 */
export default function AddPhotosScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { submitting, run } = useSubmitting();
  const { media, refresh } = useDogMedia(dogId ?? '');

  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const myUploads = media.filter((m) => m.uploaded_by === profile?.id);
  const canSubmit = photos.length > 0;

  async function submit() {
    setError(null);
    if (!dogId || photos.length === 0) return;
    if (!profile?.id) {
      setError('You must be signed in to add photos.');
      return;
    }

    const urls = await resolvePhotoUrls(photos, profile?.id ?? '');
    for (const url of urls) {
      const { error: err } = await run(() =>
        addDogMedia({
          dogId,
          type: 'photo',
          url,
          isPublic: false,
          uploadedBy: profile?.id ?? null,
          clientConsent: consent,
        }),
      );
      if (err) {
        setError(err);
        return;
      }
    }
    setPhotos([]);
    await refresh();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Your Dog" title="Add Photos" />
        <View className="px-6">
          <Typography variant="bodyMuted" className="mb-5">
            Share your own photos. The kennel reviews everything before it appears anywhere public.
          </Typography>

          <View className="mb-4">
            <Checkbox
              checked={consent}
              onChange={setConsent}
              label="Diedericks Dobermanns may use these photos publicly."
              description="Leave unticked (default) to keep photos private to you and the kennel. Tick only if you allow website or social use after review."
            />
          </View>

          <Typography variant="caption" className="mb-2 text-silver">
            Photos *
          </Typography>
          <PhotoPicker value={photos} onChange={setPhotos} max={3} />

          {error ? (
            <Typography variant="caption" className="mt-3 text-danger">
              {error}
            </Typography>
          ) : null}

          <Button
            label="Share Photos"
            onPress={submit}
            loading={submitting}
            disabled={!canSubmit}
            fullWidth
            className="mt-5"
          />

          {myUploads.length > 0 ? (
            <View className="mt-6 flex-row flex-wrap gap-3">
              {myUploads.map((m) => (
                <View key={m.id} className="h-24 w-24 overflow-hidden rounded-xl border border-gold/20 bg-surface">
                  <ThumbImage uri={m.url} size="avatar" />
                  {!m.is_public ? (
                    <View className="absolute inset-x-0 bottom-0 items-center bg-black/70 py-1">
                      <Badge label="Awaiting kennel review" tone="gold" />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          <Button label="Done" variant="ghost" onPress={() => router.back()} fullWidth className="mt-6" />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
