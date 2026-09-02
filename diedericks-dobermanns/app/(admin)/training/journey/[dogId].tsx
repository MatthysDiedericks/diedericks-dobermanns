import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { JourneyEntryEditor } from '@/components/Training/JourneyEntryEditor';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDogJourney } from '@/hooks/useDogJourney';
import { deleteJourneyEntry } from '@/lib/training/journeyMutations';
import { phaseLabel, typeLabel, type JourneyEntry } from '@/lib/training/journeyTypes';

export default function TrainingJourneyScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const { dogName, entries, loading, error, refresh } = useDogJourney(dogId ?? '');
  const [editing, setEditing] = useState<JourneyEntry | 'new' | null>(null);

  function confirmDelete(entry: JourneyEntry) {
    Alert.alert('Delete this journey entry?', 'Media attached to it is removed too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteJourneyEntry(entry.id, entry.dog_id)
            .then(refresh)
            .catch((e: unknown) =>
              Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.'),
            );
        },
      },
    ]);
  }

  return (
    <ScreenContainer scroll={false}>
      <PageHeader
        eyebrow="Training"
        title={dogName ? `${dogName} — Journey` : 'Training journey'}
      />
      <View className="px-6 pb-3">
        <Button
          label={editing === 'new' ? 'Close new entry' : '+ New entry'}
          size="sm"
          variant="outline"
          onPress={() => setEditing((cur) => (cur === 'new' ? null : 'new'))}
        />
      </View>
      {editing === 'new' ? (
        <View className="px-6">
          <JourneyEntryEditor
            dogId={dogId ?? ''}
            entry={null}
            onClose={() => setEditing(null)}
            onSaved={() => void refresh()}
          />
        </View>
      ) : null}
      {loading && entries.length === 0 ? (
        <View className="px-6">
          <CardListSkeleton count={4} />
        </View>
      ) : null}
      {error ? (
        <View className="px-6">
          <Typography variant="body" className="mb-3 text-danger">
            {error}
          </Typography>
          <Button label="Retry" size="sm" variant="outline" onPress={() => void refresh()} />
        </View>
      ) : null}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 px-6 pb-24"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={Colors.gold} />
        }
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              title="No journey entries yet"
              message="Quick-capture from the gallery, or add one here."
            />
          ) : null
        }
        renderItem={({ item }) =>
          editing !== null && editing !== 'new' && editing.id === item.id ? (
            <JourneyEntryEditor
              dogId={dogId ?? ''}
              entry={item}
              onClose={() => setEditing(null)}
              onSaved={() => void refresh()}
            />
          ) : (
            <Card>
              <Pressable onPress={() => setEditing(item)}>
                <Typography variant="body">{item.session_date}</Typography>
                <Typography variant="caption" className="text-gold">
                  {typeLabel(item.training_type)}
                  {phaseLabel(item.phase) ? ` · ${phaseLabel(item.phase)}` : ''}
                </Typography>
                {item.milestone ? (
                  <Typography variant="caption">{item.milestone}</Typography>
                ) : null}
                {item.is_draft ? (
                  <Typography variant="caption" className="text-amber-300">
                    Draft
                  </Typography>
                ) : null}
                {item.is_public ? (
                  <Typography variant="caption" className="text-gold">
                    Public
                  </Typography>
                ) : null}
                {item.training_log_media.length > 0 ? (
                  <Typography variant="caption">
                    {item.training_log_media.length} photo
                    {item.training_log_media.length === 1 ? '' : 's'}
                  </Typography>
                ) : null}
              </Pressable>
              <View className="mt-2 flex-row gap-2">
                <Button label="Edit" size="sm" variant="outline" onPress={() => setEditing(item)} />
                <Button
                  label="Delete"
                  size="sm"
                  variant="ghost"
                  onPress={() => confirmDelete(item)}
                />
                <Button
                  label="Dog"
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    router.push({ pathname: '/(admin)/dogs/[id]', params: { id: item.dog_id } })
                  }
                />
              </View>
            </Card>
          )
        }
      />
    </ScreenContainer>
  );
}
