import { Alert, View } from 'react-native';

import { ExpectingDogCard } from '@/components/dogs/DogDirectoryCard';
import { Button } from '@/components/ui/Button';
import type { ExpectingDogEntry } from '@/hooks/useKennelDogs';
import { markBreedingNoOutcome } from '@/hooks/useMutations';

interface ExpectingBreedingRowProps {
  entry: ExpectingDogEntry;
  detailRoute: string;
  onUpdated: () => void;
}

export function ExpectingBreedingRow({ entry, detailRoute, onUpdated }: ExpectingBreedingRowProps) {
  function confirmNoOutcome() {
    Alert.alert(
      'No outcome',
      'Mark this breeding as producing no puppies? The record will stay in heat history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark no outcome',
          style: 'destructive',
          onPress: () => {
            void markBreedingNoOutcome(entry.heatCycleId).then(({ error }) => {
              if (error) Alert.alert('Could not update', error);
              else onUpdated();
            });
          },
        },
      ],
    );
  }

  return (
    <View>
      <ExpectingDogCard entry={entry} detailRoute={detailRoute} />
      <Button
        label="No outcome"
        variant="outline"
        onPress={confirmNoOutcome}
        fullWidth
        className="mb-3 -mt-1"
      />
    </View>
  );
}
