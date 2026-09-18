import { Pressable, View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { Typography } from '@/components/ui/Typography';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { updateDogStatus } from '@/lib/dogs/mutations';
import { DOG_STATUSES, NO_BUYER_RECORDED_MESSAGE, isDogStatus } from '@/lib/dogs/status';
import type { Dog } from '@/types/app.types';

interface DogStatusPanelProps {
  dog: Dog;
  onStatusChanged: () => void;
}

export function DogStatusPanel({ dog, onStatusChanged }: DogStatusPanelProps) {
  async function doUpdate(value: (typeof DOG_STATUSES)[number]['value'], label: string) {
    try {
      const result = await updateDogStatus(dog.id, value);
      if (result.error) throw new Error(result.error);
      showSaved(`${dog.name} moved to ${label} ✓`);
      if (result.missingBuyer) {
        showError(NO_BUYER_RECORDED_MESSAGE);
      }
      onStatusChanged();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not update status.');
    }
  }

  return (
    <SectionCard title="Kennel status">
      <View className="mb-3 flex-row flex-wrap items-center gap-2">
        <Typography variant="caption" className="text-subtle">
          Current:
        </Typography>
        <DogStatusBadge status={dog.status} />
      </View>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {DOG_STATUSES.map((opt) => {
          const active = dog.status === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                if (active) return;
                void doUpdate(opt.value, opt.label);
              }}
              className={`rounded-xl border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {opt.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      {!isDogStatus(dog.status) && dog.status ? (
        <Typography variant="caption" className="text-subtle">
          Stored value {dog.status} is not a legal status — pick one of the options above.
        </Typography>
      ) : null}
    </SectionCard>
  );
}
