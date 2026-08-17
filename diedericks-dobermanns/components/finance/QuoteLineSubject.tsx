import { Pressable, ScrollView, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  applySubjectChange,
  formatExpectedDate,
  litterPairLabel,
  productTiers,
  puppyPickerLabel,
  SUBJECT_KIND_OPTIONS,
  TIER_REQUIRED_MESSAGE,
  type QuoteLitterOption,
  type QuotePuppyOption,
  type QuoteSubjectKind,
  type QuoteSubjectTier,
} from '@/lib/finance/quoteSubject';

type SubjectDraft = {
  key: string;
  item_type: string;
  subject_kind?: QuoteSubjectKind | null;
  dog_id?: string | null;
  litter_id?: string | null;
  programme_tier?: string | null;
  description: string;
};

export function QuoteLineSubject({
  item,
  puppies,
  litters,
  tiers,
  applicationTier,
  onUpdate,
}: {
  item: SubjectDraft;
  puppies: QuotePuppyOption[];
  litters: QuoteLitterOption[];
  tiers: QuoteSubjectTier[];
  applicationTier?: string | null;
  onUpdate: (key: string, patch: Record<string, unknown>) => void;
}) {
  if (item.item_type !== 'dog') return null;

  const kind: QuoteSubjectKind =
    item.subject_kind ?? (item.dog_id ? 'dog' : item.litter_id ? 'litter' : 'unallocated');
  const shownTiers = productTiers(tiers);
  const grouped = groupPuppies(puppies);
  const missingTier = !item.programme_tier;

  function apply(change: Parameters<typeof applySubjectChange>[1]) {
    const patch = applySubjectChange(
      {
        ...item,
        dog_id: item.dog_id ?? null,
      },
      change,
      { puppies, litters, tiers, applicationTier },
    );
    onUpdate(item.key, { ...patch, unit_price: patch.unit_price ?? 0 });
  }

  return (
    <View className="mb-3 gap-3">
      <Typography variant="label">What is this for?</Typography>
      <View className="gap-2">
        {SUBJECT_KIND_OPTIONS.map((opt) => {
          const active = kind === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => apply({ subject_kind: opt.value })}
              className={`rounded-lg border px-3 py-2 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
              }`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {opt.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {kind === 'dog' ? (
        <View>
          <Typography variant="label" className="mb-2">
            Puppy
          </Typography>
          <ScrollView className="max-h-48" nestedScrollEnabled>
            {grouped.map((g) => (
              <View key={g.label} className="mb-2">
                <Typography variant="caption" className="mb-1 text-silver">
                  {g.label}
                </Typography>
                {g.puppies.map((p) => {
                  const active = item.dog_id === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => apply({ dog_id: p.id })}
                      className={`mb-1 rounded-lg border px-3 py-2 ${
                        active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                      }`}
                    >
                      <Typography variant="caption" className={active ? 'text-gold' : 'text-ink'}>
                        {puppyPickerLabel(p)}
                      </Typography>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {kind === 'litter' ? (
        <View>
          <Typography variant="label" className="mb-2">
            Litter
          </Typography>
          {litters.map((l) => {
            const active = item.litter_id === l.id;
            const due = formatExpectedDate(l.expected_date);
            return (
              <Pressable
                key={l.id}
                onPress={() => apply({ litter_id: l.id })}
                className={`mb-1 rounded-lg border px-3 py-2 ${
                  active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                }`}
              >
                <Typography variant="caption" className={active ? 'text-gold' : 'text-ink'}>
                  {litterPairLabel(l)}
                  {due ? ` — due ${due}` : ''}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View>
        <Typography variant="label" className="mb-2">
          Tier
        </Typography>
        <View className="flex-row flex-wrap gap-2">
          {shownTiers.map((t) => {
            const active = item.programme_tier === t.tier_key;
            return (
              <Pressable
                key={t.tier_key}
                onPress={() => apply({ programme_tier: t.tier_key })}
                className={`rounded-lg border px-3 py-2 ${
                  active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                }`}
              >
                <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                  {t.display_label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
        {missingTier ? (
          <Typography variant="caption" className="mt-1 text-gold">
            {TIER_REQUIRED_MESSAGE}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}

function groupPuppies(puppies: QuotePuppyOption[]) {
  const map = new Map<string, QuotePuppyOption[]>();
  for (const p of puppies) {
    const label = p.litter_label || 'Other';
    const list = map.get(label) ?? [];
    list.push(p);
    map.set(label, list);
  }
  return [...map.entries()].map(([label, list]) => ({ label, puppies: list }));
}
