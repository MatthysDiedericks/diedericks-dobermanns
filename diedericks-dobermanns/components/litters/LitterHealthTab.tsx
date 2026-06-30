import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useLitterHealth, type PuppyHealthRecord } from '@/hooks/useLitterHealth';
import type { LitterPuppy } from '@/hooks/useLitterWeights';
import { CollarDot } from '@/lib/litters/collarColours';
import { formatKennelDate } from '@/lib/kennel/formatters';

function HealthSection({
  title,
  records,
  puppies,
  onDelete,
}: {
  title: string;
  records: PuppyHealthRecord[];
  puppies: LitterPuppy[];
  onDelete: (id: string) => void;
}) {
  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-2 text-gold">
        {title}
      </Typography>
      <Card>
        {records.length === 0 ? (
          <Typography variant="bodyMuted">None</Typography>
        ) : (
          records.map((r) => {
            const pup = puppies.find((p) => p.id === r.dog_id);
            return (
              <View key={r.id} className="mb-3 border-b border-gold/10 pb-3">
                <View className="flex-row justify-between">
                  <Typography variant="caption">{formatKennelDate(r.record_date)}</Typography>
                  <Pressable onPress={() => onDelete(r.id)}>
                    <Typography variant="caption" className="text-danger">
                      Delete
                    </Typography>
                  </Pressable>
                </View>
                <Typography variant="body">{r.type_label}</Typography>
                <Typography variant="caption" className="text-subtle">
                  {r.description}
                </Typography>
                <View className="mt-1 flex-row items-center gap-1">
                  {r.dog_id && pup ? (
                    <>
                      <CollarDot colour={pup.collar_colour} size={8} />
                      <Typography variant="caption">
                        {pup.sex === 'female' ? '♀' : '♂'} {pup.name}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="caption">All Puppies</Typography>
                  )}
                </View>
              </View>
            );
          })
        )}
      </Card>
    </View>
  );
}

export function LitterHealthTab({
  litterId,
  puppies,
}: {
  litterId: string;
  puppies: LitterPuppy[];
}) {
  const { upcoming, past, addRecord, deleteRecord } = useLitterHealth(litterId);

  async function quickAdd(type: string, label: string, desc: string) {
    try {
      await addRecord(
        {
          record_type: type,
          record_date: new Date().toISOString().slice(0, 10),
          type_label: label,
          description: desc,
        },
        [],
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    }
  }

  return (
    <View className="pb-8">
      <HealthSection
        title="UPCOMING"
        records={upcoming}
        puppies={puppies}
        onDelete={(id) => void deleteRecord(id)}
      />
      <HealthSection
        title="PAST"
        records={past}
        puppies={puppies}
        onDelete={(id) => void deleteRecord(id)}
      />
      <View className="flex-row flex-wrap gap-2">
        <Button label="+ Vaccination" size="sm" variant="outline" onPress={() => void quickAdd('vaccination', 'DHPP', 'Vaccination')} />
        <Button label="+ Deworming" size="sm" variant="outline" onPress={() => void quickAdd('deworming', 'Worms, Ticks, Fleas', 'Deworming')} />
        <Button label="+ Vet Visit" size="sm" variant="outline" onPress={() => void quickAdd('vet_visit', 'General', 'Vet visit')} />
        <Button label="+ Health Test" size="sm" variant="outline" onPress={() => void quickAdd('health_test', 'Screening', 'Health test')} />
      </View>
    </View>
  );
}
