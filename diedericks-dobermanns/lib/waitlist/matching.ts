import { colourLabel } from '@/lib/colours/dogColours';
import { categoryFromDogInterest, CATEGORY_LABELS } from '@/lib/waitlist/helpers';
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
  category?: string | null;
  tail_type?: string | null;
};

export type MatchCriterion = {
  key: 'sex' | 'colour' | 'tail' | 'waiting';
  label: string;
  matched: boolean;
  points: number;
  detail: string;
};

export type MatchCandidate = {
  entry: WaitingListEntry;
  score: number;
  perfectFit: boolean;
  criteria: MatchCriterion[];
  mismatches: string[];
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

function dogProgrammeCategory(dog: MatchableDog): string {
  const fromTier = categoryFromDogInterest(dog.programme_tier);
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

function scoreSex(
  entry: WaitingListEntry,
  dog: MatchableDog,
): { matched: boolean; points: number; detail: string; mismatch?: string } {
  const pref = normalizeSex(entry.preferred_sex);
  const dogSex = normalizeSex(dog.sex);
  if (!pref) {
    return { matched: true, points: 30, detail: 'No sex preference' };
  }
  if (pref === dogSex) {
    return { matched: true, points: 30, detail: `Sex: ${pref}` };
  }
  return {
    matched: false,
    points: 0,
    detail: `Wants ${pref}, puppy is ${dogSex ?? 'unknown'}`,
    mismatch: `Wants ${pref}, this puppy is ${dogSex ?? 'unknown'}`,
  };
}

function scoreColour(
  entry: WaitingListEntry,
  dog: MatchableDog,
): { matched: boolean; points: number; detail: string; mismatch?: string } {
  const pref = entry.preferred_colour;
  if (!pref || pref === 'no_preference' || pref === 'any') {
    return { matched: true, points: 30, detail: 'No colour preference' };
  }
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

function scoreTail(
  entry: WaitingListEntry,
  dog: MatchableDog,
): { matched: boolean; points: number; detail: string; mismatch?: string } {
  const pref = entry.tail_preference;
  if (!pref || pref === 'no_preference' || pref === 'any') {
    return { matched: true, points: 25, detail: 'No tail preference' };
  }
  if (!dog.tail_type) {
    return {
      matched: false,
      points: 0,
      detail: 'Tail not recorded on puppy',
      mismatch: `Wants ${pref} tail, this puppy's tail is not recorded`,
    };
  }
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
  const sex = scoreSex(entry, dog);
  const colour = scoreColour(entry, dog);
  const tail = scoreTail(entry, dog);
  return sex.matched && colour.matched && tail.matched;
}

/** Newborns are registered as `puppy`; both are inventory for matching. */
export function isMatchableDogStatus(status: string | null | undefined): boolean {
  return status === 'available' || status === 'puppy';
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
  const waitDays = daysWaiting(entry.date_added ?? entry.created_at);
  const criteria: MatchCriterion[] = [
    {
      key: 'sex',
      label: 'Sex',
      matched: sex.matched,
      points: sex.points,
      detail: sex.detail,
    },
    {
      key: 'colour',
      label: 'Colour',
      matched: colour.matched,
      points: colour.points,
      detail: colour.detail,
    },
    {
      key: 'tail',
      label: 'Tail',
      matched: tail.matched,
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
  const score = sex.points + colour.points + tail.points + waitPoints;
  return {
    entry,
    score,
    perfectFit: statedPreferencesMet(entry, dog),
    criteria,
    mismatches,
    daysWaiting: waitDays,
  };
}

function waitPointsForQueue(entries: WaitingListEntry[]): Map<string, number> {
  const waits = entries.map((e) => ({
    id: e.id,
    days: daysWaiting(e.date_added ?? e.created_at),
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
      if (a.perfectFit !== b.perfectFit) return a.perfectFit ? -1 : 1;
      const pa = PRIORITY_RANK[a.entry.priority ?? 'normal'] ?? 1;
      const pb = PRIORITY_RANK[b.entry.priority ?? 'normal'] ?? 1;
      if (pa !== pb) return pa - pb;
      if (b.score !== a.score) return b.score - a.score;
      const da = a.entry.date_added ?? a.entry.created_at;
      const db = b.entry.date_added ?? b.entry.created_at;
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
