import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { stageLabel } from '@/lib/waitlist/constants';
import {
  compareLongestWait,
  daysWaiting,
  isLongWait,
  type LitterQueueEntry,
} from '@/lib/waitlist/litterQueue';

export type AppLitterQueueRow = LitterQueueEntry & {
  id: string;
  name: string;
  pipeline_stage: string | null;
  payment_status: string | null;
  preferred_sex: string | null;
  preferred_colour: string | null;
  ear_preference: string | null;
  tail_preference: string | null;
  assigned_dog_id: string | null;
  assigned_litter_id?: string | null;
};

function prefs(row: AppLitterQueueRow): string {
  const parts = [row.preferred_sex, row.preferred_colour, row.ear_preference, row.tail_preference]
    .filter((v) => v && v !== 'any' && v !== 'no_preference')
    .map((v) => v!.replace(/_/g, ' '));
  return parts.length ? parts.join(' · ') : 'No stated preference';
}

function depositLabel(status: string | null): string {
  if (status === 'deposit_paid') return 'Deposit paid';
  if (status === 'paid_in_full') return 'Paid in full';
  return 'Deposit not paid';
}

export function LitterQueuePanels({
  allocated,
  general,
  puppies,
  now,
  onAllocate,
}: {
  allocated: AppLitterQueueRow[];
  general: AppLitterQueueRow[];
  puppies: { id: string; name: string }[];
  now: Date;
  onAllocate: (waitlistId: string, dogId: string) => Promise<string | null>;
}) {
  const router = useRouter();
  const waiting = [...general].sort(compareLongestWait);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function allocate(waitlistId: string, dogId: string) {
    setBusy(true);
    setError(null);
    const message = await onAllocate(waitlistId, dogId);
    setBusy(false);
    if (message) setError(message);
    else setOpenId(null);
  }

  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-2">
        Allocated to this litter ({allocated.length})
      </Typography>
      {allocated.length === 0 ? (
        <Typography variant="caption" className="mb-4 text-subtle">
          Nobody is allocated to this litter yet.
        </Typography>
      ) : (
        allocated.map((row) => {
          const pup = puppies.find((p) => p.id === row.assigned_dog_id);
          return (
            <Pressable
              key={row.id}
              onPress={() => router.push(`/(admin)/waitlist/${row.id}` as never)}
              className="mb-2 rounded-xl border border-gold/20 px-3 py-2"
            >
              <Typography variant="subtitle">{row.name}</Typography>
              <Typography variant="caption" className="text-subtle">
                {stageLabel(row.pipeline_stage)} · {depositLabel(row.payment_status)}
              </Typography>
              <Typography variant="caption">{prefs(row)}</Typography>
              <Typography variant="caption" className="text-gold">
                {pup ? `Matched ${pup.name}` : 'No puppy matched yet'}
              </Typography>
            </Pressable>
          );
        })
      )}

      <Typography variant="label" className="mb-2 mt-2">
        Waiting for a litter ({waiting.length})
      </Typography>
      {waiting.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          The general queue is empty.
        </Typography>
      ) : (
        waiting.map((row) => {
          const days = daysWaiting(row, now);
          const long = isLongWait(days);
          return (
            <View key={row.id} className="mb-2 rounded-xl border border-gold/20 px-3 py-2">
              <Pressable onPress={() => router.push(`/(admin)/waitlist/${row.id}` as never)}>
                <Typography variant="subtitle">{row.name}</Typography>
                <Typography variant="caption" className={long ? 'text-amber-200' : 'text-subtle'}>
                  {days == null ? 'Wait unknown' : `${days} days`}
                  {long ? ' · past 90 days' : ''} · {stageLabel(row.pipeline_stage)}
                </Typography>
              </Pressable>
              <Button
                label={openId === row.id ? 'Choose a puppy' : 'Allocate to a puppy'}
                size="sm"
                variant="secondary"
                onPress={() => setOpenId(openId === row.id ? null : row.id)}
                className="mt-2"
              />
              {openId === row.id
                ? puppies.map((pup) => (
                    <Pressable
                      key={pup.id}
                      disabled={busy}
                      onPress={() => void allocate(row.id, pup.id)}
                      className="mt-1 rounded-lg border border-gold/25 px-3 py-2"
                    >
                      <Typography variant="caption">{pup.name}</Typography>
                    </Pressable>
                  ))
                : null}
            </View>
          );
        })
      )}
      {error ? (
        <Typography variant="caption" className="mt-2 text-red-300">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
