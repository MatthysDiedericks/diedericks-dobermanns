import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';

import { MatchScoreBar } from '@/components/waitlist/MatchScoreBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { usePreferenceMatch } from '@/hooks/usePreferenceMatch';
import { assignWaitlistMatch, useSubmitting } from '@/hooks/useMutations';
import { allocateDogToClient } from '@/lib/dogs/allocation';
import { colourLabel } from '@/lib/colours/dogColours';
import { entryDisplayName, entryPhone } from '@/lib/waitlist/helpers';
import { supabase } from '@/lib/supabase';

export default function WaitlistMatchScreen() {
  const {
    dogs,
    selectedDogId,
    selectDog,
    selectedDog,
    results,
    mode,
    setMode,
    matchable,
    selectedBuyerId,
    selectBuyer,
    selectedBuyer,
    buyerResults,
  } = usePreferenceMatch();
  const { submitting, run } = useSubmitting();

  async function allocate(entryId: string, dogId: string, dogName: string) {
    const name = entryDisplayName(
      matchable.find((r) => r.id === entryId) ?? ({ enquirer_name: 'buyer' } as never),
    );
    Alert.alert(
      'Confirm allocation',
      `${dogName} → ${name}. This sets the puppy to reserved and moves the buyer to matched.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Allocate',
          onPress: () => {
            void run(async () => {
              const { data: entry } = supabase
                ? await supabase.from('waiting_list').select('client_id').eq('id', entryId).single()
                : { data: null };
              const litterId =
                dogs.find((d) => d.id === dogId)?.litter_id ?? selectedDog?.litter_id ?? null;
              const stage = await assignWaitlistMatch(entryId, { dogId, litterId });
              if (stage.error) return stage;
              if (entry?.client_id) {
                const alloc = await allocateDogToClient(dogId, entry.client_id);
                if (alloc.error) return alloc;
              } else if (supabase) {
                await supabase
                  .from('dogs')
                  .update({ status: 'reserved' } as never)
                  .eq('id', dogId);
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
      <View className="mb-3 flex-row gap-2 px-4">
        <Pressable
          onPress={() => setMode('dog')}
          className={`rounded-lg border px-3 py-1.5 ${mode === 'dog' ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
        >
          <Typography variant="caption" className={mode === 'dog' ? 'text-gold' : ''}>
            Who gets this puppy
          </Typography>
        </Pressable>
        <Pressable
          onPress={() => setMode('buyer')}
          className={`rounded-lg border px-3 py-1.5 ${mode === 'buyer' ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
        >
          <Typography variant="caption" className={mode === 'buyer' ? 'text-gold' : ''}>
            Puppies for a buyer
          </Typography>
        </Pressable>
      </View>

      <ScrollView className="px-4 pb-12">
        {mode === 'dog' ? (
          <>
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
              <Typography variant="bodyMuted">
                Choose an available or newborn puppy to see ranked matches.
              </Typography>
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
                  {mismatches.map((m) => (
                    <Typography key={m} variant="caption" className="mt-1 text-danger">
                      {m}
                    </Typography>
                  ))}
                  <View className="mt-3 flex-row gap-2">
                    <Button
                      label="Allocate"
                      size="sm"
                      loading={submitting}
                      onPress={() => allocate(entry.id, selectedDog.id, selectedDog.name)}
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
          </>
        ) : (
          <>
            <Typography variant="label" className="mb-2 text-gold">
              Select buyer
            </Typography>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {matchable.map((e) => (
                <Button
                  key={e.id}
                  label={entryDisplayName(e)}
                  size="sm"
                  variant={selectedBuyerId === e.id ? 'primary' : 'outline'}
                  onPress={() => selectBuyer(e.id)}
                  className="mr-2"
                />
              ))}
            </ScrollView>
            {!selectedBuyer ? (
              <Typography variant="bodyMuted">Choose a buyer to see which puppies fit.</Typography>
            ) : buyerResults.length === 0 ? (
              <Typography variant="bodyMuted">No matching puppies in the current inventory.</Typography>
            ) : (
              buyerResults.map(({ dog, candidate }, idx) => (
                <Card key={dog.id} className={`mb-3 p-4 ${idx === 0 ? 'border-gold' : ''}`}>
                  <Typography variant="subtitle">
                    {dog.name}
                    {dog.sex ? ` · ${dog.sex}` : ''}
                    {dog.colour ? ` · ${colourLabel(dog.colour)}` : ''}
                  </Typography>
                  <Typography variant="caption" className="text-silver">
                    Score {candidate.score}
                    {candidate.perfectFit ? ' · Perfect fit' : ''}
                  </Typography>
                  {candidate.mismatches.map((m) => (
                    <Typography key={m} variant="caption" className="mt-1 text-danger">
                      {m}
                    </Typography>
                  ))}
                  <View className="mt-3">
                    <Button
                      label="Allocate"
                      size="sm"
                      loading={submitting}
                      onPress={() => allocate(selectedBuyer.id, dog.id, dog.name)}
                    />
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
