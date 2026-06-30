import { Alert, FlatList, Pressable, View } from 'react-native';

import { EmptyTabState } from '@/components/dogs/detail/EmptyTabState';
import { RecordBottomSheet, type RecordSheetRef } from '@/components/dogs/detail/RecordBottomSheet';
import { useDogShows } from '@/hooks/useDogDetail';
import { parseDateInput, showError } from '@/lib/dogDetail/feedback';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { Typography } from '@/components/ui/Typography';
import { useRef, useState } from 'react';

const FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'location', label: 'Location' },
  { key: 'club', label: 'Club' },
  { key: 'organisation', label: 'Organisation' },
  { key: 'start_date', label: 'Start date', placeholder: 'YYYY-MM-DD', required: true },
  { key: 'end_date', label: 'End date', placeholder: 'YYYY-MM-DD' },
  { key: 'placement', label: 'Placement', placeholder: '1st' },
  { key: 'award', label: 'Award', placeholder: 'Best of Breed' },
  { key: 'notes', label: 'Notes', multiline: true },
];

export function DogShowsTab({ dogId }: { dogId: string }) {
  const { shows, loading, addShow, deleteShow } = useDogShows(dogId);
  const sheetRef = useRef<RecordSheetRef>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const start = parseDateInput(values.start_date ?? '');
    if (!values.title?.trim() || !start) {
      showError('Title and valid start date are required.');
      return;
    }
    setSaving(true);
    try {
      await addShow({
        title: values.title.trim(),
        location: values.location?.trim() || null,
        club: values.club?.trim() || null,
        organisation: values.organisation?.trim() || null,
        start_date: start,
        end_date: parseDateInput(values.end_date ?? ''),
        placement: values.placement?.trim() || null,
        award: values.award?.trim() || null,
        notes: values.notes?.trim() || null,
      });
      setValues({});
      sheetRef.current?.close();
    } catch {
      /* hook shows error */
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('Delete show entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteShow(id) },
    ]);
  }

  if (!loading && shows.length === 0) {
    return (
      <>
        <EmptyTabState
          message="No show records yet. Add your first entry."
          actionLabel="Add Show Entry"
          onAction={() => sheetRef.current?.open()}
        />
        <RecordBottomSheet
          ref={sheetRef}
          title="Add Show Entry"
          fields={FIELDS}
          values={values}
          onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
          onSave={() => void onSave()}
          saving={saving}
        />
      </>
    );
  }

  return (
    <View className="pb-8">
      <Pressable
        onPress={() => sheetRef.current?.open()}
        className="mb-4 rounded-xl border border-gold/40 bg-gold/10 py-3"
      >
        <Typography variant="label" className="text-center text-gold">
          + Add Show Entry
        </Typography>
      </Pressable>
      <FlatList
        data={shows}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => confirmDelete(item.id)}
            className="mb-2 rounded-xl border border-gold/15 bg-surface p-4"
          >
            <Typography variant="subtitle">{item.title}</Typography>
            <Typography variant="caption" className="mt-1">
              {formatKennelDate(item.start_date)}
              {item.placement ? ` · ${item.placement}` : ''}
              {item.award ? ` · ${item.award}` : ''}
            </Typography>
            {item.location ? (
              <Typography variant="caption" className="text-muted">
                {item.location}
              </Typography>
            ) : null}
          </Pressable>
        )}
      />
      <RecordBottomSheet
        ref={sheetRef}
        title="Add Show Entry"
        fields={FIELDS}
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        onSave={() => void onSave()}
        saving={saving}
      />
    </View>
  );
}
