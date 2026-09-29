import { colourLabel } from '@/lib/colours/dogColours';
import { holdRanksAfterPeer } from '@/lib/waitlist/hold';
import { CATEGORY_LABELS } from '@/lib/waitlist/helpers';
import { daysWaiting } from '@/lib/waitlist/constants';
import type { WaitingListEntry } from '@/types/app.types';

/** Puppy / dog fields the matcher needs — keep this narrow so web + app share it. */
export type MatchableDog = {
  id: string;
  name: string;
  sex: string | null;
  colour: string | null;
  status: string | null;
  programme_tier?: string | null;
  /** Litter intent, used only when this puppy has no tier of its own. */
  litter_default_programme_tier?: string | null;
  category?: string | null;
  tail_type?: string | null;
};

export type MatchCriterion = {
  key: 'sex' | 'colour' | 'tail' | 'waiting';
  label: string;
  matched: boolean;
  /** Recorded on the buyer, not on the dog. Scored 0. Not a mismatch. */
  unknown?: boolean;
  points: number;
  detail: string;
};

export type MatchCandidate = {
  entry: WaitingListEntry;
  score: number;
  perfectFit: boolean;
  criteria: MatchCriterion[];
  mismatches: string[];
  warnings: string[];
  daysWaiting: number;
};

/** Stages still looking for a puppy. Already matched/reserved/done are out. */
export const MATCHABLE_STAGES = ['approved', 'quote_sent', 'deposit_paid'] as const;

const PRIORITY_RANK: Record<string, number> = { high: 0, normal: 1, low: 2 };

function normalizeSex(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === 'any' || v === 'no_preference' || v === 'either') return null;
  if (v.startsWith('m')) return 'male';
  if (v.startsWith('f')) return 'female';
  return v;
}

/**
 * Waiting-list rows store `elite_developed` / `protection_dog`.
 * Do not collapse those through categoryFromDogInterest — that helper
 * rewrites them to `elite` / `protection`, and then no elite buyer matches.
 */
function tierToPreferredCategory(tier: string | null | undefined): string {
  if (tier === 'elite_developed') return 'elite_developed';
  if (tier === 'protection_dog') return 'protection_dog';
  if (tier === 'puppy') return 'standard';
  return 'any';
}

function dogProgrammeCategory(dog: MatchableDog): string {
  const fromTier = tierToPreferredCategory(dog.programme_tier || dog.litter_default_programme_tier);
  if (fromTier !== 'any') return fromTier;
  const cat = dog.category ?? 'standard';
  if (cat === 'puppy') return 'standard';
  if (cat === 'elite' || cat === 'protection' || cat === 'standard') return cat;
  return 'any';
}

function categoryMatches(entry: WaitingListEntry, dog: MatchableDog): boolean {
  const pref = entry.preferred_category ?? 'any';
  if (!pref || pref === 'any') return true;
  return pref === dogProgrammeCategory(dog);
}

type Scored = {
  matched: boolean;
  unknown?: boolean;
  points: number;
  detail: string;
  mismatch?: string;
  warning?: string;
};

/** An unrecorded dog field scores 0 and warns. It is not a failed preference. */
function unknownField(label: string): Scored {
  const detail = `${label} not recorded`;
  return { matched: false, unknown: true, points: 0, detail, warning: detail };
}

function preferenceMet(scored: Scored): boolean {
  return scored.matched || Boolean(scored.unknown);
}

function scoreSex(entry: WaitingListEntry, dog: MatchableDog): Scored {
  const pref = normalizeSex(entry.preferred_sex);
  const dogSex = normalizeSex(dog.sex);
  if (!pref) {
    return { matched: true, points: 30, detail: 'No sex preference' };
  }
  if (!dogSex) return unknownField('Sex');
  if (pref === dogSex) {
    return { matched: true, points: 30, detail: `Sex: ${pref}` };
  }
  return {
    matched: false,
    points: 0,
    detail: `Wants ${pref}, puppy is ${dogSex}`,
    mismatch: `Wants ${pref}, this puppy is ${dogSex}`,
  };
}

function scoreColour(entry: WaitingListEntry, dog: MatchableDog): Scored {
  const pref = entry.preferred_colour;
  if (!pref || pref === 'no_preference' || pref === 'any') {
    return { matched: true, points: 30, detail: 'No colour preference' };
  }
  if (!dog.colour) return unknownField('Colour');
  if (pref === dog.colour) {
    return { matched: true, points: 30, detail: `Colour: ${colourLabel(pref)}` };
  }
  return {
    matched: false,
    points: 0,
    detail: `Wants ${colourLabel(pref)}, puppy is ${colourLabel(dog.colour)}`,
    mismatch: `Wants ${colourLabel(pref)}, this puppy is ${colourLabel(dog.colour)}`,
  };
}

function scoreTail(entry: WaitingListEntry, dog: MatchableDog): Scored {
  const pref = entry.tail_preference;
  if (!pref || pref === 'no_preference' || pref === 'any') {
    return { matched: true, points: 25, detail: 'No tail preference' };
  }
  if (!dog.tail_type) return unknownField('Tail');
  if (pref === dog.tail_type) {
    return { matched: true, points: 25, detail: `Tail: ${pref}` };
  }
  return {
    matched: false,
    points: 0,
    detail: `Wants ${pref}, puppy is ${dog.tail_type}`,
    mismatch: `Wants ${pref} tail, this puppy is ${dog.tail_type}`,
  };
}

function statedPreferencesMet(entry: WaitingListEntry, dog: MatchableDog): boolean {
  return (
    preferenceMet(scoreSex(entry, dog)) &&
    preferenceMet(scoreColour(entry, dog)) &&
    preferenceMet(scoreTail(entry, dog))
  );
}

/** For-sale inventory. `puppy` is a category, not a status. */
export function isMatchableDogStatus(status: string | null | undefined): boolean {
  return status === 'available';
}

export function passesHardFilters(entry: WaitingListEntry, dog: MatchableDog): boolean {
  const stage = entry.pipeline_stage ?? 'enquiry';
  if (!(MATCHABLE_STAGES as readonly string[]).includes(stage)) return false;
  if (!isMatchableDogStatus(dog.status)) return false;
  if (!categoryMatches(entry, dog)) return false;
  return true;
}

export function scoreMatch(
  entry: WaitingListEntry,
  dog: MatchableDog,
  waitPoints: number,
): MatchCandidate {
  const sex = scoreSex(entry, dog);
  const colour = scoreColour(entry, dog);
  const tail = scoreTail(entry, dog);
  const waitDays = daysWaiting(entry.queue_anchor_at ?? entry.date_added ?? entry.created_at);
  const criteria: MatchCriterion[] = [
    {
      key: 'sex',
      label: 'Sex',
      matched: sex.matched,
      unknown: sex.unknown,
      points: sex.points,
      detail: sex.detail,
    },
    {
      key: 'colour',
      label: 'Colour',
      matched: colour.matched,
      unknown: colour.unknown,
      points: colour.points,
      detail: colour.detail,
    },
    {
      key: 'tail',
      label: 'Tail',
      matched: tail.matched,
      unknown: tail.unknown,
      points: tail.points,
      detail: tail.detail,
    },
    {
      key: 'waiting',
      label: 'Waiting time',
      matched: true,
      points: waitPoints,
      detail: `${waitDays} days waiting`,
    },
  ];
  const mismatches = [sex.mismatch, colour.mismatch, tail.mismatch].filter(
    (m): m is string => Boolean(m),
  );
  const warnings = [sex.warning, colour.warning, tail.warning].filter(
    (w): w is string => Boolean(w),
  );
  const score = sex.points + colour.points + tail.points + waitPoints;
  return {
    entry,
    score,
    perfectFit: statedPreferencesMet(entry, dog),
    criteria,
    mismatches,
    warnings,
    daysWaiting: waitDays,
  };
}

function waitPointsForQueue(entries: WaitingListEntry[]): Map<string, number> {
  const waits = entries.map((e) => ({
    id: e.id,
    days: daysWaiting(e.queue_anchor_at ?? e.date_added ?? e.created_at),
  }));
  const max = Math.max(...waits.map((w) => w.days), 1);
  const map = new Map<string, number>();
  for (const w of waits) {
    map.set(w.id, Math.round(15 * (w.days / max)));
  }
  return map;
}

/** Ranked buyers for one puppy. Suggests only — never assigns. */
export function rankBuyersForDog(
  entries: WaitingListEntry[],
  dog: MatchableDog,
): MatchCandidate[] {
  const eligible = entries.filter((e) => passesHardFilters(e, dog));
  const waitMap = waitPointsForQueue(eligible);
  return eligible
    .map((e) => scoreMatch(e, dog, waitMap.get(e.id) ?? 0))
    .sort((a, b) => {
      const held = holdRanksAfterPeer(a.entry, b.entry);
      if (held !== 0) return held;
      if (a.perfectFit !== b.perfectFit) return a.perfectFit ? -1 : 1;
      const pa = PRIORITY_RANK[a.entry.priority ?? 'normal'] ?? 1;
      const pb = PRIORITY_RANK[b.entry.priority ?? 'normal'] ?? 1;
      if (pa !== pb) return pa - pb;
      if (b.score !== a.score) return b.score - a.score;
      const da = a.entry.queue_anchor_at ?? a.entry.date_added ?? a.entry.created_at;
      const db = b.entry.queue_anchor_at ?? b.entry.date_added ?? b.entry.created_at;
      return da.localeCompare(db);
    });
}

/** Reverse view: which available puppies fit this buyer. */
export function rankDogsForBuyer(
  entry: WaitingListEntry,
  dogs: MatchableDog[],
): { dog: MatchableDog; candidate: MatchCandidate }[] {
  const inventory = dogs.filter((d) => isMatchableDogStatus(d.status));
  const waitMap = waitPointsForQueue([entry]);
  const waitPts = waitMap.get(entry.id) ?? 0;
  return inventory
    .filter((d) => passesHardFilters(entry, d))
    .map((dog) => ({ dog, candidate: scoreMatch(entry, dog, waitPts) }))
    .sort((a, b) => {
      if (a.candidate.perfectFit !== b.candidate.perfectFit) {
        return a.candidate.perfectFit ? -1 : 1;
      }
      if (b.candidate.score !== a.candidate.score) return b.candidate.score - a.candidate.score;
      return a.dog.name.localeCompare(b.dog.name);
    });
}

export function preferenceChipLabel(entry: WaitingListEntry): string {
  const parts: string[] = [];
  const cat = CATEGORY_LABELS[entry.preferred_category ?? 'any'] ?? entry.preferred_category;
  if (cat) parts.push(cat);
  const sex = normalizeSex(entry.preferred_sex);
  if (sex === 'male') parts.push('Male');
  else if (sex === 'female') parts.push('Female');
  if (entry.preferred_colour && entry.preferred_colour !== 'no_preference') {
    parts.push(colourLabel(entry.preferred_colour));
  }
  if (entry.tail_preference && entry.tail_preference !== 'no_preference') {
    parts.push(entry.tail_preference === 'docked' ? 'Docked' : 'Natural');
  }
  return parts.join(' · ') || 'No preferences set';
}

function categoryLabel(category: string): string {
  if (category === 'elite_developed') return 'Elite developed';
  if (category === 'protection_dog') return 'Protection';
  return CATEGORY_LABELS[category] ?? category;
}

function matchableEntries(entries: WaitingListEntry[]): WaitingListEntry[] {
  return entries.filter((e) =>
    (MATCHABLE_STAGES as readonly string[]).includes(e.pipeline_stage ?? 'enquiry'),
  );
}

/**
 * When a hard filter removes every dog for a tier, say which tier and why.
 * An empty list is not an explanation.
 */
export function tierGapSummary(entries: WaitingListEntry[], dogs: MatchableDog[]): string[] {
  const buyers = matchableEntries(entries);
  const inventory = dogs.filter((d) => isMatchableDogStatus(d.status));
  const categories = [
    ...new Set(
      buyers
        .map((e) => e.preferred_category)
        .filter((c): c is string => Boolean(c) && c !== 'any'),
    ),
  ];
  const lines: string[] = [];
  for (const category of categories) {
    const wanting = buyers.filter((e) => e.preferred_category === category).length;
    const carrying = inventory.filter((d) => dogProgrammeCategory(d) === category).length;
    if (wanting > 0 && carrying === 0) {
      const noun = wanting === 1 ? 'buyer wants' : 'buyers want';
      lines.push(
        `${wanting} ${noun} ${categoryLabel(category)}; no available dog carries that tier`,
      );
    }
  }
  return lines;
}

/** Reason the reverse view is empty. Null when at least one dog ranks. */
export function explainEmptyDogsForBuyer(
  entry: WaitingListEntry,
  dogs: MatchableDog[],
): string | null {
  if (rankDogsForBuyer(entry, dogs).length > 0) return null;
  const gaps = tierGapSummary([entry], dogs);
  if (gaps.length) return gaps[0];
  if (!dogs.some((d) => isMatchableDogStatus(d.status))) return 'No available dogs.';
  return 'No available dog passes the filters for this buyer.';
}

/** Reason a puppy's buyer list is empty. Null when at least one buyer ranks. */
export function explainEmptyBuyersForDog(
  entries: WaitingListEntry[],
  dog: MatchableDog,
  dogs: MatchableDog[] = [dog],
): string | null {
  if (rankBuyersForDog(entries, dog).length > 0) return null;
  const gaps = tierGapSummary(entries, dogs);
  if (gaps.length) return gaps.join(' ');
  return 'No matchable buyers for this puppy.';
}
