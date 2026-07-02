import { differenceInWeeks } from 'date-fns';

import { isActiveMatchStage, isDoNotSell } from '@/lib/waitlist/helpers';
import type { Dog, WaitingListEntry } from '@/types/app.types';

export interface MatchResult {
  entry: WaitingListEntry;
  score: number;
  criteria: { label: string; matched: boolean }[];
}

function colourMatches(entry: WaitingListEntry, dog: Dog): boolean {
  const pref = entry.preferred_colour?.toLowerCase();
  if (!pref || pref === 'any') return true;
  return (dog.colour ?? '').toLowerCase().includes(pref);
}

export function scoreMatch(entry: WaitingListEntry, dog: Dog): MatchResult {
  if (isDoNotSell(entry)) {
    return { entry, score: 0, criteria: [{ label: 'Do Not Sell', matched: false }] };
  }

  let score = 0;
  const criteria: { label: string; matched: boolean }[] = [];

  const cat = entry.preferred_category ?? 'any';
  const dogCat = (dog.category ?? 'standard').replace('puppy', 'standard');
  const catOk = cat === 'any' || cat === dogCat;
  if (catOk) score += 40;
  criteria.push({ label: 'Category', matched: catOk });

  const sexOk = !entry.preferred_sex || entry.preferred_sex === 'any' || entry.preferred_sex === dog.sex;
  if (sexOk) score += 20;
  criteria.push({ label: 'Sex', matched: sexOk });

  const colourOk = colourMatches(entry, dog);
  if (colourOk) score += 15;
  criteria.push({ label: 'Colour', matched: colourOk });

  const earOk = !entry.ear_preference || entry.ear_preference === 'no_preference';
  if (earOk) score += 10;
  criteria.push({ label: 'Ears', matched: earOk });

  const tailOk = !entry.tail_preference || entry.tail_preference === 'no_preference';
  if (tailOk) score += 10;
  criteria.push({ label: 'Tail', matched: tailOk });

  const paidOk =
    entry.payment_status === 'deposit_paid' || entry.payment_status === 'paid_in_full';
  if (paidOk) score += 5;
  criteria.push({ label: 'Deposit paid', matched: paidOk });

  if (entry.priority === 'high') score += 5;

  const weeks = differenceInWeeks(new Date(), new Date(entry.created_at));
  score += Math.min(Math.floor(weeks / 2), 20);

  return { entry, score: Math.min(score, 100), criteria };
}

export function rankMatches(entries: WaitingListEntry[], dog: Dog): MatchResult[] {
  return entries
    .filter((e) => isActiveMatchStage(e))
    .map((e) => scoreMatch(e, dog))
    .sort((a, b) => b.score - a.score);
}
