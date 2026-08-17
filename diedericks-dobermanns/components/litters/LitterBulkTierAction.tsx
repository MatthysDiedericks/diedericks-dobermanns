import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { applyLitterDefaultTier } from '@/lib/litters/applyLitterDefaultTier';
import {
  PROGRAMME_TIER_KEYS,
  type ProgrammeTierKey,
} from '@/lib/finance/quotePrice';

const LABELS: Record<ProgrammeTierKey, string> = {
  puppy: 'Standard Puppy',
  elite_developed: 'Elite Developed',
  protection_dog: 'Protection Dog',
};

export function LitterBulkTierAction({
  litterId,
  currentTier,
  onApplied,
}: {
  litterId: string;
  currentTier?: string | null;
  onApplied?: () => void;
}) {
  const [tier, setTier] = useState<ProgrammeTierKey>(
    (PROGRAMME_TIER_KEYS as readonly string[]).includes(currentTier ?? '')
      ? (currentTier as ProgrammeTierKey)
      : 'puppy',
  );
  const [busy, setBusy] = useState(false);

  return (
    <Card className="mb-4">
      <Typography variant="subtitle">Set tier for all puppies in this litter</Typography>
      <Typography variant="caption" className="mt-1 text-ink-muted">
        Applies to puppies with no own tier or price. Existing prices and tiers are left alone.
      </Typography>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {PROGRAMME_TIER_KEYS.map((k) => (
          <Pressable
            key={k}
            onPress={() => setTier(k)}
            className={`rounded-lg border px-3 py-2 ${
              tier === k ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
            }`}
          >
            <Typography variant="caption">{LABELS[k]}</Typography>
          </Pressable>
        ))}
      </View>
      <Button
        label={busy ? 'Applying…' : 'Apply to puppies without a tier'}
        variant="outline"
        className="mt-3"
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void applyLitterDefaultTier(litterId, tier)
            .then((res) => {
              Alert.alert(
                'Tier applied',
                `Updated ${res.updated} ${res.updated === 1 ? 'puppy' : 'puppies'}. ${res.skipped} already had a tier or price.`,
              );
              onApplied?.();
            })
            .catch((e) => Alert.alert('Could not apply tier', e instanceof Error ? e.message : 'Try again.'))
            .finally(() => setBusy(false));
        }}
      />
    </Card>
  );
}
