import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { formatPrice } from '@/lib/format';
import { formatKennelDate } from '@/lib/kennel/formatters';
import {
  allocatePuppyToLitterQuote,
  type LitterQuoteHolder,
} from '@/lib/finance/litterQuoteHolders';

function preferenceBits(h: LitterQuoteHolder): string {
  const bits = [h.dogInterest, h.preferredSex, h.preferredColour, h.tailPreference]
    .filter((v) => v && v !== 'no_preference')
    .map((v) => v!.replace(/_/g, ' '));
  return bits.length ? bits.join(' · ') : 'No stated preference';
}

export function LitterQuoteHolders({
  holders,
  puppies,
  onAllocated,
}: {
  holders: LitterQuoteHolder[];
  puppies: { id: string; name: string; status: string | null; collar_colour?: string | null }[];
  onAllocated?: () => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const available = puppies.filter((p) => p.status === 'available');

  if (!holders.length) return null;

  return (
    <View className="mb-6 gap-3">
      <Typography variant="label">Places in this litter</Typography>
      <Typography variant="caption" className="text-ink-muted">
        These buyers hold a place here — not a puppy. Allocating updates their existing quote.
      </Typography>
      {holders.map((h) => (
        <Card key={h.quoteItemId}>
          <Typography variant="subtitle">
            {h.buyerName} · {h.quoteNumber} · {formatPrice(h.total)}
          </Typography>
          <Typography variant="caption" className="mt-1 text-ink-muted">
            {h.depositPaid ? 'Deposit paid' : 'Deposit not yet paid'} · {formatKennelDate(h.quotedAt)}
          </Typography>
          <Typography variant="caption" className="mt-1 text-silver">
            {preferenceBits(h)}
          </Typography>
          <View className="mt-3 gap-2">
            {available.map((p) => {
              const active = picked[h.quoteItemId] === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPicked((prev) => ({ ...prev, [h.quoteItemId]: p.id }))}
                  className={`rounded-lg border px-3 py-2 ${
                    active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                  }`}
                >
                  <Typography variant="caption" className={active ? 'text-gold' : 'text-ink'}>
                    {p.name}
                    {p.collar_colour ? ` (${p.collar_colour})` : ''}
                  </Typography>
                </Pressable>
              );
            })}
            <Button
              label={busy === h.quoteItemId ? 'Allocating…' : 'Allocate'}
              disabled={busy === h.quoteItemId || !picked[h.quoteItemId]}
              onPress={() => {
                const dogId = picked[h.quoteItemId];
                if (!dogId) return;
                setBusy(h.quoteItemId);
                void allocatePuppyToLitterQuote(h.quoteItemId, dogId).then((res) => {
                  setBusy(null);
                  if (res.error) Alert.alert('Could not allocate', res.error);
                  else onAllocated?.();
                });
              }}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}
