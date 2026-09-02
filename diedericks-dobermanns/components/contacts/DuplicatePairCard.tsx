import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { DupeContact, MoveImpact, OpenDuplicatePair } from '@/lib/contacts/duplicates';

const FIELDS: { key: keyof DupeContact; label: string }[] = [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'whatsapp_number', label: 'WhatsApp' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'company', label: 'Company' },
  { key: 'contact_type', label: 'Type' },
  { key: 'source', label: 'Source' },
];

function filledCount(c: DupeContact) {
  return FIELDS.filter((f) => c[f.key]).length;
}

function moveSummary(impact: MoveImpact): string {
  const parts: string[] = [];
  if (impact.dogs) parts.push(`${impact.dogs} dog${impact.dogs === 1 ? '' : 's'}`);
  if (impact.checkIns) {
    parts.push(`${impact.checkIns} check-in${impact.checkIns === 1 ? '' : 's'}`);
  }
  if (impact.testimonials) {
    parts.push(`${impact.testimonials} testimonial${impact.testimonials === 1 ? '' : 's'}`);
  }
  if (!parts.length) return 'No linked dogs, check-ins or testimonials will move.';
  return `${parts.join(', ')} will move to this record.`;
}

export function DuplicatePairCard({
  pair,
  onMerge,
  onDismiss,
}: {
  pair: OpenDuplicatePair;
  onMerge: (survivorId: string, loserId: string) => Promise<void>;
  onDismiss: () => Promise<void>;
}) {
  const defaultSurvivor = filledCount(pair.a) >= filledCount(pair.b) ? pair.a.id : pair.b.id;
  const [survivorId, setSurvivorId] = useState(defaultSurvivor);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loserId = survivorId === pair.a.id ? pair.b.id : pair.a.id;
  const loserImpact = survivorId === pair.a.id ? pair.impactB : pair.impactA;
  const summary = useMemo(() => moveSummary(loserImpact), [loserImpact]);

  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <Typography variant="label" className="mb-3 text-gold">
        {pair.confidence} · {pair.matchReason}
        {pair.matchDetail ? ` · ${pair.matchDetail}` : ''}
      </Typography>

      {FIELDS.map(({ key, label }) => {
        const av = pair.a[key] ?? '—';
        const bv = pair.b[key] ?? '—';
        const diff = String(av) !== String(bv);
        return (
          <View key={key} className="border-t border-gold/10 py-2">
            <Typography variant="caption" className="text-subtle">
              {label}
            </Typography>
            <View className="mt-1 flex-row gap-3">
              <Typography variant="caption" className={`flex-1 ${diff ? 'text-gold' : 'text-text'}`}>
                {String(av)}
              </Typography>
              <Typography variant="caption" className={`flex-1 ${diff ? 'text-gold' : 'text-text'}`}>
                {String(bv)}
              </Typography>
            </View>
          </View>
        );
      })}

      <Typography variant="caption" className="mt-4 text-subtle">
        Keep as survivor:
      </Typography>
      {([pair.a, pair.b] as const).map((c) => (
        <Pressable
          key={c.id}
          onPress={() => setSurvivorId(c.id)}
          className="mt-2 flex-row items-center gap-2"
        >
          <View
            className={`h-4 w-4 rounded-full border ${
              survivorId === c.id ? 'border-gold bg-gold' : 'border-gold/40'
            }`}
          />
          <Typography variant="body">{c.full_name}</Typography>
        </Pressable>
      ))}
      <Typography variant="caption" className="mt-2 text-subtle">
        {summary}
      </Typography>

      {confirm ? (
        <View className="mt-4 rounded-sm border border-gold/40 bg-gold/10 p-3">
          <Typography variant="caption">
            Merging is not reversible through the UI. The other record stays in the database as a
            merged row and can only be recovered with a database job.
          </Typography>
          <View className="mt-3 flex-row gap-2">
            <Button
              label="Confirm merge"
              size="sm"
              loading={pending}
              onPress={() => void run(() => onMerge(survivorId, loserId))}
            />
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setConfirm(false)} />
          </View>
        </View>
      ) : (
        <View className="mt-4 flex-row flex-wrap gap-3">
          <Button label="Merge" size="sm" onPress={() => setConfirm(true)} />
          <Button
            label="Not duplicates"
            variant="outline"
            size="sm"
            loading={pending}
            onPress={() => void run(onDismiss)}
          />
          <Typography variant="caption" className="self-center text-subtle">
            Skip — leave open
          </Typography>
        </View>
      )}
      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}
    </Card>
  );
}
