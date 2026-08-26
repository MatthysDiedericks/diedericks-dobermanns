import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { LitterBulkTierAction } from '@/components/litters/LitterBulkTierAction';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import {
  isProgrammeTierKey,
  PROGRAMME_TIER_SELECT_OPTIONS,
  programmeTierLabel,
} from '@/lib/dogs/programmeTier';
import { titleCase } from '@/lib/format';
import { formatPuppyAge, formatWeight } from '@/lib/kennel/formatters';
import { CollarDot, collarLabel } from '@/lib/litters/collarColours';
import { setProgrammeTierForDogs } from '@/lib/litters/setPuppyProgrammeTiers';
import type { Dog } from '@/types/app.types';

export function LitterPuppiesTab({
  litterId,
  puppies,
  onChanged,
}: {
  litterId: string;
  puppies: Dog[];
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = puppies.filter((p) => selected[p.id]).map((p) => p.id);

  return (
    <View className="pb-8">
      <Button
        label="Register More Pups"
        onPress={() => router.push(`/(admin)/litters/${litterId}/register-pups` as never)}
        fullWidth
        className="mb-4"
      />
      {puppies.length ? (
        <LitterBulkTierAction
          litterId={litterId}
          selectedIds={selectedIds}
          onApplied={() => {
            setSelected({});
            onChanged?.();
          }}
        />
      ) : null}
      <View className="gap-3">
        {puppies.map((p) => {
          const ext = p as Dog & {
            birth_weight_grams?: number | null;
            collar_colour?: string | null;
          };
          const ticked = Boolean(selected[p.id]);
          return (
            <Card key={p.id}>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => setSelected((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  className={`mr-3 h-6 w-6 items-center justify-center rounded-sm border ${
                    ticked ? 'border-gold bg-gold/20' : 'border-gold/30'
                  }`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: ticked }}
                >
                  {ticked ? <Typography variant="caption">✓</Typography> : null}
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/(admin)/dogs/${p.id}` as never)}
                  className="flex-1 flex-row items-center"
                >
                  <CollarDot colour={ext.collar_colour} />
                  <View className="ml-3 flex-1">
                    <Typography variant="subtitle">
                      {p.sex === 'male' ? '♂' : '♀'} {p.name}
                    </Typography>
                    <Typography variant="caption">
                      {p.colour} · {titleCase(p.status ?? '')} · {collarLabel(ext.collar_colour)}
                    </Typography>
                    {ext.birth_weight_grams ? (
                      <Typography variant="caption" className="text-subtle">
                        Birth {formatWeight(ext.birth_weight_grams / 1000)} · {formatPuppyAge(p.date_of_birth)}
                      </Typography>
                    ) : null}
                  </View>
                </Pressable>
              </View>
              <PuppyTierChips
                litterId={litterId}
                dogId={p.id}
                value={p.programme_tier ?? null}
                onChanged={onChanged}
              />
            </Card>
          );
        })}
      </View>
    </View>
  );
}

function PuppyTierChips({
  litterId,
  dogId,
  value,
  onChanged,
}: {
  litterId: string;
  dogId: string;
  value: string | null;
  onChanged?: () => void;
}) {
  const current = value ?? '';
  return (
    <View className="mt-3">
      <Typography variant="caption" className="mb-2 text-muted">
        Programme {programmeTierLabel(value)}
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {PROGRAMME_TIER_SELECT_OPTIONS.map((opt) => {
          const active = current === opt.value;
          return (
            <Pressable
              key={opt.value || 'unset'}
              onPress={() => {
                const next = isProgrammeTierKey(opt.value) ? opt.value : null;
                void setProgrammeTierForDogs(litterId, [dogId], next)
                  .then(() => onChanged?.())
                  .catch((e) =>
                    Alert.alert('Could not set tier', e instanceof Error ? e.message : 'Try again.'),
                  );
              }}
              className={`rounded-lg border px-3 py-1.5 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
              }`}
            >
              <Typography variant="caption">{opt.label}</Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
