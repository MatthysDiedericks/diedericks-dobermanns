import { Linking, ScrollView, View } from 'react-native';

import { MatchScoreBar } from '@/components/waitlist/MatchScoreBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { usePreferenceMatch } from '@/hooks/usePreferenceMatch';
import { assignWaitlistMatch, useSubmitting } from '@/hooks/useMutations';
import { daysWaiting } from '@/lib/waitlist/constants';
import { entryDisplayName, entryPhone } from '@/lib/waitlist/helpers';

export default function WaitlistMatchScreen() {
  const { dogs, selectedDogId, selectDog, selectedDog, results } = usePreferenceMatch();
  const { submitting, run } = useSubmitting();

  async function assign(entryId: string) {
    await run(() =>
      assignWaitlistMatch(entryId, {
        dogId: selectedDog?.id ?? null,
        litterId: null,
      }),
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Waiting List" title="Preference Matching" />
      <ScrollView className="px-4 pb-12">
        <Typography variant="label" className="mb-2 text-gold">Select dog</Typography>
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
          <Typography variant="bodyMuted">Choose a dog or puppy to see ranked matches.</Typography>
        ) : (
          results.map(({ entry, score, criteria }, idx) => (
            <Card key={entry.id} className={`mb-3 p-4 ${idx === 0 ? 'border-gold' : ''}`}>
              <Typography variant="subtitle">{entryDisplayName(entry)}</Typography>
              <Typography variant="caption" className="text-silver">
                {daysWaiting(entry.created_at)} days waiting
              </Typography>
              <MatchScoreBar score={score} />
              {criteria.map((c) => (
                <Typography key={c.label} variant="caption" className={c.matched ? 'text-success' : 'text-silver'}>
                  {c.matched ? '✓' : '✗'} {c.label}
                </Typography>
              ))}
              <View className="mt-3 flex-row gap-2">
                <Button label="Assign & notify" size="sm" loading={submitting} onPress={() => void assign(entry.id)} />
                {entryPhone(entry) ? (
                  <Button label="Call" size="sm" variant="outline" onPress={() => Linking.openURL(`tel:${entryPhone(entry)}`)} />
                ) : null}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
