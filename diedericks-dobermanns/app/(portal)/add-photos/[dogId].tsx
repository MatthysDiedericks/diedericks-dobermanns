import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { saveTimelineEntry, useSubmitting } from '@/hooks/useMutations';
import { resolvePhotoUrls } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddPhotosScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { submitting, run } = useSubmitting();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && date.trim().length > 0 && photos.length > 0;

  async function submit() {
    setError(null);
    if (!dogId) return;
    if (!canSubmit) {
      setError('Please add a name, a date, and at least one photo.');
      return;
    }
    const photo_urls = await resolvePhotoUrls(photos);
    const { error: err } = await run(() =>
      saveTimelineEntry({
        dog_id: dogId,
        source: 'client',
        category: 'client_update',
        entry_date: date.trim(),
        title: title.trim(),
        notes: notes.trim() || null,
        photo_urls,
        author_id: profile?.id ?? null,
      }),
    );
    if (err) {
      setError(err);
      return;
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Your Dog" title="Add Photos" />
        <View className="px-6">
          <Typography variant="bodyMuted" className="mb-5">
            Share up to 3 photos of your dog. A name and date are required.
          </Typography>

          <Input
            label="Name *"
            placeholder="e.g. Beach day with Luna"
            value={title}
            onChangeText={setTitle}
          />
          <Input
            label="Date * (YYYY-MM-DD)"
            placeholder="2026-06-22"
            autoCapitalize="none"
            value={date}
            onChangeText={setDate}
          />
          <Input label="Caption (optional)" value={notes} onChangeText={setNotes} multiline className="h-24" />

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
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
