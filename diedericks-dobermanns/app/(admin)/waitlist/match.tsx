import { Alert, Linking, ScrollView, View } from 'react-native';

import { MatchScoreBar } from '@/components/waitlist/MatchScoreBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { usePreferenceMatch } from '@/hooks/usePreferenceMatch';
import { assignWaitlistMatch, useSubmitting } from '@/hooks/useMutations';
import { allocateDogToClient } from '@/lib/dogs/allocation';
import { entryDisplayName, entryPhone } from '@/lib/waitlist/helpers';
import { supabase } from '@/lib/supabase';

export default function WaitlistMatchScreen() {
  const { dogs, selectedDogId, selectDog, selectedDog, results } = usePreferenceMatch();
  const { submitting, run } = useSubmitting();

  async function allocate(entryId: string) {
    if (!selectedDog) return;
    const name = entryDisplayName(
      results.find((r) => r.entry.id === entryId)?.entry ?? { enquirer_name: 'buyer' } as never,
    );
    Alert.alert(
      'Confirm allocation',
      `${selectedDog.name} → ${name}. This sets the puppy to reserved and moves the buyer to matched.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Allocate',
          onPress: () => {
            void run(async () => {
              const { data: entry } = supabase
                ? await supabase
                    .from('waiting_list')
                    .select('client_id')
                    .eq('id', entryId)
                    .single()
                : { data: null };
              const stage = await assignWaitlistMatch(entryId, {
                dogId: selectedDog.id,
                litterId: selectedDog.litter_id ?? null,
              });
              if (stage.error) return stage;
              if (entry?.client_id) {
                const alloc = await allocateDogToClient(selectedDog.id, entry.client_id);
                if (alloc.error) return alloc;
              } else if (supabase) {
                await supabase
                  .from('dogs')
                  .update({ status: 'reserved' } as never)
                  .eq('id', selectedDog.id);
              }
              return { error: null };
            });
          },
        },
      ],
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Waiting List" title="Preference Matching" />
      <ScrollView className="px-4 pb-12">
        <Typography variant="label" className="mb-2 text-gold">
          Select dog
        </Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {dogs.map((d) => (
            <Button
              key={d.id}
              label={d.name}
              size="sm"
              variant={selectedDogId === d.id ? 'primary' : 'outline'}
              onPress={() => selectDog(d.id)}
              className="mr-2"
            />
          ))}
        </ScrollView>

        {!selectedDog ? (
          <Typography variant="bodyMuted">Choose an available puppy to see ranked matches.</Typography>
        ) : (
          results.map(({ entry, score, criteria, mismatches, daysWaiting: days, perfectFit }, idx) => (
            <Card key={entry.id} className={`mb-3 p-4 ${idx === 0 ? 'border-gold' : ''}`}>
              <Typography variant="subtitle">{entryDisplayName(entry)}</Typography>
              <Typography
                variant="caption"
                className={days >= 180 ? 'text-danger' : days >= 90 ? 'text-warning' : 'text-silver'}
              >
                {days} days waiting{perfectFit ? ' · Perfect fit' : ''}
              </Typography>
              <MatchScoreBar score={score} />
              {criteria.map((c) => (
                <Typography
                  key={c.label}
                  variant="caption"
                  className={c.matched ? 'text-success' : 'text-silver'}
                >
                  {c.matched ? '✓' : '✗'} {c.detail}
                </Typography>
              ))}
              {mismatches.length ? (
                <View className="mt-2">
                  {mismatches.map((m) => (
                    <Typography key={m} variant="caption" className="text-danger">
                      {m}
                    </Typography>
                  ))}
                </View>
              ) : null}
              <View className="mt-3 flex-row gap-2">
                <Button
                  label="Allocate"
                  size="sm"
                  loading={submitting}
                  onPress={() => allocate(entry.id)}
                />
                {entryPhone(entry) ? (
                  <Button
                    label="Call"
                    size="sm"
                    variant="outline"
                    onPress={() => Linking.openURL(`tel:${entryPhone(entry)}`)}
                  />
                ) : null}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
