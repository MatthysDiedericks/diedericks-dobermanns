import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { showError } from '@/lib/dogDetail/feedback';
import { updateDogStatus } from '@/lib/dogs/mutations';
import {
  DOG_STATUSES,
  NO_BUYER_RECORDED_MESSAGE,
  dogStatusLabel,
  isDogStatus,
  type DogStatus,
} from '@/lib/dogs/status';

export function DogStatusControl({
  dogId,
  status,
  onStatusChanged,
}: {
  dogId: string;
  status: string | null;
  onStatusChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState(status ?? 'available');
  const [notice, setNotice] = useState<string | null>(null);
  const [missingBuyer, setMissingBuyer] = useState(false);

  useEffect(() => {
    setCurrent(status ?? 'available');
  }, [status]);

  async function choose(next: DogStatus) {
    if (next === current || pending) return;
    const previous = current;
    setCurrent(next);
    setOpen(false);
    setPending(true);
    setNotice(null);
    setMissingBuyer(false);
    try {
      const result = await updateDogStatus(dogId, next);
      if (result.error) {
        setCurrent(previous);
        showError(result.error);
        return;
      }
      const label = dogStatusLabel(next);
      setNotice(
        result.stampedDeceasedAt
          ? `Saved — ${label}. Date of death recorded as today.`
          : `Saved — ${label}.`,
      );
      setMissingBuyer(result.missingBuyer);
      onStatusChanged?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="min-w-[160px] flex-1">
      <Pressable
        onPress={() => !pending && setOpen((v) => !v)}
        disabled={pending}
        accessibilityRole="button"
        accessibilityLabel="Change dog status"
        className="rounded-xl border border-gold/30 bg-surface px-3 py-2"
      >
        <Typography variant="caption" className="text-gold">
          {isDogStatus(current) ? dogStatusLabel(current) : 'Status'}
          {pending ? ' · Saving…' : open ? ' ▴' : ' ▾'}
        </Typography>
      </Pressable>
      {open ? (
        <View className="mt-2 rounded-xl border border-gold/20 bg-surface">
          {DOG_STATUSES.map((opt) => {
            const active = current === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => void choose(opt.value)}
                className={`px-3 py-2 ${active ? 'bg-gold/15' : ''}`}
              >
                <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                  {opt.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {notice ? (
        <Typography variant="caption" className="mt-1 text-success">
          {notice}
        </Typography>
      ) : null}
      {missingBuyer ? (
        <Typography variant="caption" className="mt-1 text-amber-200">
          {NO_BUYER_RECORDED_MESSAGE} Record the buyer in Ownership below.
        </Typography>
      ) : null}
    </View>
  );
}
