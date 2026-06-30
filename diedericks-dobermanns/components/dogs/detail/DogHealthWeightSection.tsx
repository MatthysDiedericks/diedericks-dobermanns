import { Alert, FlatList, Pressable, TextInput, View } from 'react-native';
import { useState } from 'react';

import { AccordionSection } from '@/components/dogs/detail/AccordionSection';
import { EmptyTabState } from '@/components/dogs/detail/EmptyTabState';
import { useWeightLogs } from '@/hooks/useDogDetail';
import { parseDateInput, showError } from '@/lib/dogDetail/feedback';
import { formatKennelDate, formatWeight } from '@/lib/kennel/formatters';
import { parseWeightInput } from '@/hooks/useLitterWeights';
import { Typography } from '@/components/ui/Typography';

function confirmDelete(label: string, onDelete: () => void) {
  Alert.alert(`Delete ${label}?`, 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
  ]);
}

export function DogHealthWeightSection({ dogId }: { dogId: string }) {
  const weights = useWeightLogs(dogId);
  const [weightKg, setWeightKg] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightSaving, setWeightSaving] = useState(false);
  const recentWeights = weights.logs.slice(0, 10);
  const latest = weights.logs[0];

  async function logWeight() {
    const kg = parseWeightInput(weightKg);
    const date = parseDateInput(weightDate);
    if (kg == null || !date) {
      showError('Enter a valid weight and date.');
      return;
    }
    setWeightSaving(true);
    try {
      await weights.addWeight(kg, date);
      setWeightKg('');
    } finally {
      setWeightSaving(false);
    }
  }

  return (
    <AccordionSection title="Weight log" count={recentWeights.length}>
      {latest ? (
        <Typography variant="subtitle" className="mb-3 text-gold">
          Latest: {formatWeight(Number(latest.weight_kg))} ({formatKennelDate(latest.recorded_date)})
        </Typography>
      ) : null}
      <View className="mb-3 gap-2 rounded-xl border border-gold/20 bg-black-rich p-3">
        <TextInput
          value={weightDate}
          onChangeText={setWeightDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#8C8474"
          className="rounded-lg border border-gold/20 px-3 py-2 font-body text-ink"
        />
        <TextInput
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="kg (e.g. 1.250)"
          keyboardType="decimal-pad"
          placeholderTextColor="#8C8474"
          className="rounded-lg border border-gold/20 px-3 py-2 font-body text-ink"
        />
        <Pressable
          onPress={() => void logWeight()}
          disabled={weightSaving}
          className="rounded-lg bg-gold py-2"
        >
          <Typography variant="label" className="text-center text-black-rich">
            {weightSaving ? 'Saving…' : 'Log Weight'}
          </Typography>
        </Pressable>
      </View>
      {recentWeights.length === 0 ? (
        <EmptyTabState message="No weights logged yet." />
      ) : (
        <FlatList
          data={recentWeights}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() =>
                confirmDelete('weight entry', () => void weights.deleteWeight(item.id))
              }
              className="mb-1 flex-row justify-between border-b border-gold/10 py-2"
            >
              <Typography variant="caption">{formatKennelDate(item.recorded_date)}</Typography>
              <Typography variant="body">{formatWeight(Number(item.weight_kg))}</Typography>
            </Pressable>
          )}
        />
      )}
    </AccordionSection>
  );
}
