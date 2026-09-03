import { resolveQuotePrice, type QuotePriceResult } from '@/lib/finance/quotePrice';
import { programmeTierLabel } from '@/lib/dogs/programmeTier';

export type QuoteSubjectKind = 'dog' | 'litter' | 'unallocated';

export const SUBJECT_KIND_OPTIONS: { value: QuoteSubjectKind; label: string }[] = [
  { value: 'dog', label: 'A specific puppy' },
  { value: 'litter', label: 'A future litter' },
  { value: 'unallocated', label: 'A puppy — litter not yet decided' },
];

export const TIER_REQUIRED_MESSAGE = 'Choose Standard or Elite — this sets the price.';

export const PRODUCT_TIER_KEYS = ['puppy', 'elite_developed'] as const;

/** Restore the picker when a saved line has no programme_tier column. */
export function inferTierKeyFromDescription(description: string): string | null {
  const d = description.toLowerCase();
  if (d.includes('elite')) return 'elite_developed';
  if (d.includes('standard')) return 'puppy';
  return null;
}

export type QuoteSubjectTier = {
  tier_key: string;
  display_label: string;
  price: number;
  price_on_request?: boolean | null;
};

export type QuotePuppyOption = {
  id: string;
  name: string;
  collar_colour: string | null;
  sex: string | null;
  colour: string | null;
  tail_type: string | null;
  birth_order: number | null;
  status: string | null;
  price: number | null;
  programme_tier: string | null;
  litter_id: string | null;
  litter_default_tier: string | null;
  litter_label: string;
};

export type QuoteLitterOption = {
  id: string;
  mother_name: string;
  father_name: string;
  expected_date: string | null;
  status: string;
  default_programme_tier: string | null;
};

export function litterPairLabel(litter: {
  mother_name?: string | null;
  father_name?: string | null;
}): string {
  const dam = litter.mother_name?.trim() || 'Dam';
  const sire = litter.father_name?.trim() || 'Sire';
  return `${dam} × ${sire}`;
}

export function formatExpectedDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function colourPhrase(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code === 'black_tan' || code === 'black/rust' || code === 'black_rust') return 'black & tan';
  if (code === 'brown_tan' || code === 'red/rust' || code === 'red_rust') return 'brown & tan';
  return code.replace(/[_/]/g, ' ').toLowerCase();
}

function tailPhrase(tail: string | null | undefined): string | null {
  if (!tail) return null;
  if (tail === 'docked') return 'docked';
  if (tail === 'natural') return 'natural tail';
  return tail.replace(/_/g, ' ').toLowerCase();
}

export function puppyPickerLabel(puppy: QuotePuppyOption): string {
  const collar = puppy.collar_colour ? titleCase(puppy.collar_colour) : null;
  const head = puppy.birth_order
    ? `Puppy ${puppy.birth_order}${collar ? ` (${collar})` : ''}`
    : collar
      ? `${puppy.name} (${collar})`
      : puppy.name;
  const bits = [puppy.sex, colourPhrase(puppy.colour)].filter(Boolean);
  return bits.length ? `${head} · ${bits.join(' · ')}` : head;
}

export function dogLineDescription(puppy: QuotePuppyOption): string {
  const collar = puppy.collar_colour ? titleCase(puppy.collar_colour) : null;
  const head = puppy.birth_order
    ? `Puppy ${puppy.birth_order}${collar ? ` (${collar})` : ''}`
    : collar
      ? `${puppy.name} (${collar})`
      : puppy.name;
  const bits = [
    puppy.litter_label || null,
    puppy.sex,
    colourPhrase(puppy.colour),
    tailPhrase(puppy.tail_type),
    programmeTierLabel(puppy.programme_tier, null),
  ].filter(Boolean);
  return bits.length ? `${head} — ${bits.join(', ')}` : head;
}

export function litterLineDescription(litter: QuoteLitterOption, tierLabel: string): string {
  const pair = litterPairLabel(litter);
  const due = formatExpectedDate(litter.expected_date);
  return due ? `${tierLabel} from ${pair}, expected ${due}` : `${tierLabel} from ${pair}`;
}

export function unallocatedLineDescription(tierLabel: string): string {
  return `${tierLabel} — litter to be confirmed`;
}

export function subjectStatement(input: {
  kind: QuoteSubjectKind;
  puppy?: QuotePuppyOption | null;
  litter?: QuoteLitterOption | null;
  tierLabel?: string | null;
}): string | null {
  if (input.kind === 'dog' && input.puppy) {
    return `This reserves ${dogLineDescription(input.puppy)}. Once the deposit is paid, this puppy comes off the available list.`;
  }
  if (input.kind === 'litter' && input.litter) {
    const pair = litterPairLabel(input.litter);
    const due = formatExpectedDate(input.litter.expected_date);
    const when = due ? `, expected ${due}` : '';
    return `This reserves a place in the ${pair} litter${when}. Your specific puppy is chosen once the litter is born and assessed.`;
  }
  if (input.kind === 'unallocated') {
    const tier = input.tierLabel?.trim() || 'Dobermann';
    return `This reserves a place on the waiting list for a ${tier}. Your litter is confirmed later.`;
  }
  return null;
}

export function quoteDogStatements(
  items: {
    item_type: string;
    subject_kind?: QuoteSubjectKind | null;
    dog_id?: string | null;
    litter_id?: string | null;
    programme_tier?: string | null;
  }[],
  dogs: QuotePuppyOption[],
  litters: QuoteLitterOption[],
  tiers: { tier_key: string; display_label: string }[],
): string[] {
  return items
    .filter((it) => it.item_type === 'dog')
    .map((it) => {
      const kind = it.subject_kind ?? (it.dog_id ? 'dog' : it.litter_id ? 'litter' : 'unallocated');
      return subjectStatement({
        kind,
        puppy: it.dog_id ? dogs.find((d) => d.id === it.dog_id) ?? null : null,
        litter: it.litter_id ? litters.find((l) => l.id === it.litter_id) ?? null : null,
        tierLabel:
          (it.programme_tier
            ? tiers.find((t) => t.tier_key === it.programme_tier)?.display_label
            : null) ?? programmeTierLabel(it.programme_tier, null),
      });
    })
    .filter((s): s is string => Boolean(s));
}

export function defaultSubjectKind(input: {
  specificDogId?: string | null;
  litterInterestId?: string | null;
}): QuoteSubjectKind {
  if (input.specificDogId) return 'dog';
  if (input.litterInterestId) return 'litter';
  return 'unallocated';
}

export function consistentSubject(
  kind: QuoteSubjectKind,
  dogId: string | null | undefined,
  litterId: string | null | undefined,
): boolean {
  if (kind === 'dog') return Boolean(dogId);
  if (kind === 'litter') return Boolean(litterId) && !dogId;
  return !dogId && !litterId;
}

export function idsForSubject(
  kind: QuoteSubjectKind,
  dogId: string | null,
  litterId: string | null,
): { dog_id: string | null; litter_id: string | null } {
  if (kind === 'dog') return { dog_id: dogId, litter_id: litterId };
  if (kind === 'litter') return { dog_id: null, litter_id: litterId };
  return { dog_id: null, litter_id: null };
}

export function productTiers(tiers: QuoteSubjectTier[]): QuoteSubjectTier[] {
  const wanted = new Set<string>(PRODUCT_TIER_KEYS);
  const listed = tiers.filter((t) => wanted.has(t.tier_key));
  return listed.length ? listed : tiers.slice(0, 2);
}

export type SubjectLinePatch = {
  subject_kind: QuoteSubjectKind;
  dog_id: string | null;
  litter_id: string | null;
  programme_tier: string | null;
  description: string;
  unit_price: number | null;
  priceOnRequest?: boolean;
  priceSourceLabel?: string | null;
};

export function applySubjectChange(
  current: {
    subject_kind?: QuoteSubjectKind | null;
    dog_id: string | null;
    litter_id?: string | null;
    programme_tier?: string | null;
    description: string;
  },
  change: {
    subject_kind?: QuoteSubjectKind;
    dog_id?: string | null;
    litter_id?: string | null;
    programme_tier?: string | null;
  },
  ctx: {
    puppies: QuotePuppyOption[];
    litters: QuoteLitterOption[];
    tiers: QuoteSubjectTier[];
    applicationTier?: string | null;
  },
): SubjectLinePatch {
  const kind = change.subject_kind ?? current.subject_kind ?? 'unallocated';
  let dogId = change.dog_id !== undefined ? change.dog_id : current.dog_id;
  let litterId = change.litter_id !== undefined ? change.litter_id : current.litter_id ?? null;
  let tierKey =
    change.programme_tier !== undefined ? change.programme_tier : current.programme_tier ?? null;

  if (kind === 'dog') {
    litterId = dogId ? ctx.puppies.find((p) => p.id === dogId)?.litter_id ?? litterId : null;
  } else if (kind === 'litter') {
    dogId = null;
  } else {
    dogId = null;
    litterId = null;
  }

  const puppy = dogId ? ctx.puppies.find((p) => p.id === dogId) ?? null : null;
  const litter = litterId ? ctx.litters.find((l) => l.id === litterId) ?? null : null;
  if (puppy?.programme_tier) tierKey = puppy.programme_tier;
  else if (!tierKey) tierKey = ctx.applicationTier ?? null;

  const tier = tierKey ? ctx.tiers.find((t) => t.tier_key === tierKey) : undefined;
  const tierLabel = tier?.display_label ?? 'Puppy';

  let description = current.description;
  if (kind === 'dog' && puppy) description = dogLineDescription(puppy);
  else if (kind === 'litter' && litter) description = litterLineDescription(litter, tierLabel);
  else if (kind === 'unallocated' && tierKey) description = unallocatedLineDescription(tierLabel);

  const priced: QuotePriceResult = resolveQuotePrice(
    {
      dogPrice: puppy?.price,
      dogTier: puppy?.programme_tier,
      applicationTier: tierKey ?? ctx.applicationTier,
    },
    ctx.tiers,
  );

  return {
    subject_kind: kind,
    dog_id: dogId,
    litter_id: kind === 'unallocated' ? null : litterId,
    programme_tier: tierKey,
    description,
    unit_price: priced.unitPrice,
    priceOnRequest: priced.priceOnRequest,
    priceSourceLabel: priced.sourceLabel,
  };
}

