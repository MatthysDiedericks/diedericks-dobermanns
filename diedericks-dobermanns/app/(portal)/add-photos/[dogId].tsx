import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { ThumbImage } from '@/components/media/ThumbImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useDogMedia } from '@/hooks/useDogMedia';
import { addDogMedia, useSubmitting } from '@/hooks/useMutations';
import {
  mapOwnerPhotoWindow,
  ownerPhotoWindowLabel,
  type OwnerPhotoWindow,
} from '@/lib/portal/ownerPhotos';
import { resolvePhotoUrls } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/**
 * Client photos of a dog they own. Always is_public=false / client_consent=false
 * on insert; Matt approves one photo at a time. Cap of 3 per 4-month window is
 * enforced by RLS as well as this UI.
 */
export default function AddPhotosScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { submitting, run } = useSubmitting();
  const { media, refresh } = useDogMedia(dogId ?? '');

  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [windowInfo, setWindowInfo] = useState<OwnerPhotoWindow>({
    windowOpenAt: null,
    photosInWindow: 0,
    canUpload: false,
    nextWindowAt: null,
  });

  const loadWindow = useCallback(async () => {
    if (!dogId) return;
    const { data, error: err } = await supabase.rpc('owner_photo_window', {
      p_dog_id: dogId,
    });
    if (err) return;
    const row = Array.isArray(data) ? data[0] : data;
    setWindowInfo(mapOwnerPhotoWindow(row ?? null));
  }, [dogId]);

  useEffect(() => {
    void loadWindow();
  }, [loadWindow]);

  const myUploads = media.filter((m) => m.uploaded_by === profile?.id);
  const remaining = Math.max(0, 3 - windowInfo.photosInWindow);
  const canSubmit = photos.length > 0 && windowInfo.canUpload && photos.length <= remaining;

  async function submit() {
    setError(null);
    if (!dogId || photos.length === 0) return;
    if (!profile?.id) {
      setError('You must be signed in to add photos.');
      return;
    }
    if (!windowInfo.canUpload) {
      setError(ownerPhotoWindowLabel(windowInfo));
      return;
    }
    if (photos.length > remaining) {
      setError(`Only ${remaining} photo${remaining === 1 ? '' : 's'} left this window.`);
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
          clientConsent: false,
        }),
      );
      if (err) {
        setError(
          /policy|check|violat/i.test(err)
            ? 'This photo could not be added — the three-photo window may be full.'
            : err,
        );
        return;
      }
    }
    setPhotos([]);
    await refresh();
    await loadWindow();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Your Dog" title="Add Photos" />
        <View className="px-6">
          <Typography variant="bodyMuted" className="mb-3">
            Up to three photos every four months. Nothing goes public until Matt approves that
            specific photo.
          </Typography>
          <Typography variant="caption" className="mb-5 text-gold">
            {ownerPhotoWindowLabel(windowInfo)}
          </Typography>

          {windowInfo.canUpload ? (
            <>
              <Typography variant="caption" className="mb-2 text-silver">
                Photos * (max {remaining} this window)
              </Typography>
              <PhotoPicker value={photos} onChange={setPhotos} max={remaining} />
            </>
          ) : (
            <Typography variant="bodyMuted" className="mb-4">
              {ownerPhotoWindowLabel(windowInfo)}
            </Typography>
          )}

          {error ? (
            <Typography variant="caption" className="mt-3 text-danger">
              {error}
            </Typography>
          ) : null}

          {windowInfo.canUpload ? (
            <Button
              label="Share Photos"
              onPress={submit}
              loading={submitting}
              disabled={!canSubmit}
              fullWidth
              className="mt-5"
            />
          ) : null}

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

          <Button
            label="Report a change in health"
            variant="ghost"
            onPress={() => router.push(`/(portal)/report-health/${dogId}`)}
            fullWidth
            className="mt-6"
          />
          <Button label="Done" variant="ghost" onPress={() => router.back()} fullWidth className="mt-2" />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
