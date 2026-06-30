import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { DogStory } from '@/components/dogs/DogStory';
import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDogs';
import { useDogTimeline } from '@/hooks/useRecords';
import { deleteTimelineEntry, saveTimelineEntry, useSubmitting } from '@/hooks/useMutations';
import { resolvePhotoUrls } from '@/lib/storage';
import { titleCase } from '@/lib/format';
import type { TimelineCategory } from '@/types/app.types';

const CATEGORIES: TimelineCategory[] = ['training', 'milestone', 'health', 'general'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDogStoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dog, loading, error } = useDog(id);
  const { data: entries, refetch } = useDogTimeline(id ?? '');
  const { submitting, run } = useSubmitting();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState<TimelineCategory>('training');
  const [notes, setNotes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  async function add() {
    if (!id || !title.trim() || !date.trim()) return;
    const photo_urls = await resolvePhotoUrls(photos);
    const { error } = await run(() =>
      saveTimelineEntry({
        dog_id: id,
        source: 'kennel',
        category,
        entry_date: date.trim(),
        title: title.trim(),
        notes: notes.trim() || null,
        photo_urls,
        video_url: videoUrl.trim() || null,
      }),
    );
    if (!error) {
      setTitle('');
      setNotes('');
      setVideoUrl('');
      setPhotos([]);
      setDate(today());
      await refetch();
    }
  }

  async function onDelete(entryId: string) {
    await run(() => deleteTimelineEntry(entryId));
    await refetch();
  }

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <Typography variant="bodyMuted">Loading…</Typography>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer className="px-6 items-center justify-center">
        <Typography variant="subtitle" className="text-danger">{error}</Typography>
        <Button label="Go back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  if (!dog) {
    return (
      <ScreenContainer className="px-6">
        <PageHeader eyebrow="Story" title="Dog Story" />
        <Typography variant="bodyMuted">Dog not found.</Typography>
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Story" title={dog.name} />

        <View className="px-6">
          <SectionHeader eyebrow="New entry" title="Post an Update" />
          <Input label="Title" placeholder="e.g. Protection foundation" value={title} onChangeText={setTitle} />
          <Input
            label="Date (YYYY-MM-DD)"
            placeholder="2026-01-15"
            autoCapitalize="none"
            value={date}
            onChangeText={setDate}
          />

          <Typography variant="caption" className="mb-2 text-silver">
            Category
          </Typography>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  className={`rounded-xl border px-4 py-2.5 ${
                    active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                  }`}
                >
                  <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                    {titleCase(c)}
                  </Typography>
                </Pressable>
              );
            })}
          </View>

          <Input label="Notes" value={notes} onChangeText={setNotes} multiline className="h-24" />

          <Typography variant="caption" className="mb-2 text-silver">
            Photos
          </Typography>
          <View className="mb-4">
            <PhotoPicker value={photos} onChange={setPhotos} max={6} />
          </View>

          <Input
            label="Training video URL (optional)"
            placeholder="https://..."
            autoCapitalize="none"
            value={videoUrl}
            onChangeText={setVideoUrl}
          />

          <Button label="Post Update" onPress={add} loading={submitting} fullWidth className="mt-2" />
        </View>

        <View className="mt-10 px-6">
          <SectionHeader eyebrow="History" title="Timeline" />
          {entries.length === 0 ? (
            <Typography variant="bodyMuted">No entries yet. Post the first update above.</Typography>
          ) : (
            <DogStory entries={entries} onDelete={onDelete} />
          )}
          <Button label="Done" variant="outline" onPress={() => router.back()} fullWidth className="mt-2" />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
