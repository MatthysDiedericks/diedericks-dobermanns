import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { DogHealthTab } from '@/components/portal/DogHealthTab';
import { DogInfoTab } from '@/components/portal/DogInfoTab';
import { DogNotesTab } from '@/components/portal/DogNotesTab';
import { DogProfileHero } from '@/components/portal/DogProfileHero';
import { DogTrainingTab } from '@/components/portal/DogTrainingTab';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useClientDogNotes } from '@/hooks/useClientDogNotes';
import { useDog } from '@/hooks/useDogs';
import { useTrainingLogs, useVaccinations } from '@/hooks/useRecords';

type TabId = 'info' | 'health' | 'training' | 'notes';

const TABS: { id: TabId; label: string }[] = [
  { id: 'info', label: 'INFO' },
  { id: 'health', label: 'HEALTH' },
  { id: 'training', label: 'TRAINING' },
  { id: 'notes', label: 'MY NOTES' },
];

export default function PuppyTrackerScreen() {
  const { puppyId } = useLocalSearchParams<{ puppyId: string }>();
  const router = useRouter();
  const id = puppyId ?? '';
  const { dog, loading, error, refresh: refreshDog } = useDog(id);
  const { data: vaccinations, refetch: refetchVax } = useVaccinations(id);
  const { data: logs, refetch: refetchLogs } = useTrainingLogs(id);
  const { notes, saving, save, refresh: refreshNotes } = useClientDogNotes(id);
  const [tab, setTab] = useState<TabId>('info');
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refreshDog(), refreshNotes(), refetchVax(), refetchLogs()]);
    setRefreshing(false);
  }

  if (loading && !dog) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Typography variant="subtitle" className="text-danger">
          {error}
        </Typography>
        <Button label="Go back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  if (!dog) {
    return (
      <ScreenContainer className="px-6">
        <Typography variant="bodyMuted">Dog not found.</Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} contentContainerStyle={{ paddingTop: 0 }}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Colors.gold} />
        }
      >
        <DogProfileHero dog={dog} nickname={notes?.nickname} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4 mt-2 max-h-12 px-4"
          contentContainerStyle={{ gap: 8 }}
        >
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              className={`rounded-full border px-4 py-2 ${
                tab === t.id ? 'border-gold bg-gold/15' : 'border-gold/25'
              }`}
            >
              <Typography variant="caption">{t.label}</Typography>
            </Pressable>
          ))}
        </ScrollView>

        {tab === 'info' ? (
          <DogInfoTab dog={dog} notes={notes} saving={saving} onSave={save} />
        ) : null}
        {tab === 'health' ? <DogHealthTab vaccinations={vaccinations} /> : null}
        {tab === 'training' ? <DogTrainingTab dogId={dog.id} logs={logs} /> : null}
        {tab === 'notes' ? (
          <DogNotesTab dogName={dog.name} notes={notes} saving={saving} onSave={save} />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
