import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  isProgrammeTierKey,
  PROGRAMME_TIER_SELECT_OPTIONS,
  type ProgrammeTierKey,
} from '@/lib/dogs/programmeTier';
import { setProgrammeTierForDogs } from '@/lib/litters/setPuppyProgrammeTiers';

export function LitterBulkTierAction({
  litterId,
  selectedIds,
  onApplied,
}: {
  litterId: string;
  selectedIds: string[];
  onApplied?: () => void;
}) {
  const [tier, setTier] = useState<string>('puppy');
  const [busy, setBusy] = useState(false);
  const count = selectedIds.length;
  const label = PROGRAMME_TIER_SELECT_OPTIONS.find((o) => o.value === tier)?.label ?? 'Not set';

  return (
    <View className="mb-4">
      <Typography variant="subtitle">Set tier for selected</Typography>
      <Typography variant="caption" className="mt-1 text-ink-muted">
        Tick puppies, choose a tier, apply. Unselected puppies are left alone.
      </Typography>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {PROGRAMME_TIER_SELECT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value || 'unset'}
            onPress={() => setTier(opt.value)}
            className={`rounded-lg border px-3 py-2 ${
              tier === opt.value ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
            }`}
          >
            <Typography variant="caption">{opt.label}</Typography>
          </Pressable>
        ))}
      </View>
      <Button
        label={busy ? 'Applying…' : count ? `Apply to ${count}` : 'Tick puppies first'}
        variant="outline"
        className="mt-3"
        disabled={busy || count === 0}
        onPress={() => {
          const next: ProgrammeTierKey | null = isProgrammeTierKey(tier) ? tier : null;
          setBusy(true);
          void setProgrammeTierForDogs(litterId, selectedIds, next)
            .then((res) => {
              Alert.alert('Tier set', `Updated ${res.updated} ${res.updated === 1 ? 'puppy' : 'puppies'} to ${label}.`);
              onApplied?.();
            })
            .catch((e) => Alert.alert('Could not set tier', e instanceof Error ? e.message : 'Try again.'))
            .finally(() => setBusy(false));
        }}
      />
    </View>
  );
}
