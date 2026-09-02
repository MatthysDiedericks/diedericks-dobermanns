import {
  buildHealthCalendar,
  upcomingDueLabel,
  type DewormingLike,
  type HealthCalendarUpcoming,
  type VaccinationLike,
} from '@/lib/dogs/healthCalendar';
import { requireSupabase } from '@/lib/supabase';

export type KennelHealthDueRow = HealthCalendarUpcoming & {
  dogId: string;
  dogName: string;
  dueLabel: string;
};

const VAX_SELECT =
  'id, dog_id, vaccine_name, date_administered, next_due_date, administered_by, doctor_name';
const WORM_SELECT =
  'id, dog_id, product_name, treatment_date, next_due_date, treatment_type, administered_by, doctor_name';

/** Kennel-wide due list using the same calendar rules and "Was due …" wording. */
export async function fetchKennelHealthDue(): Promise<KennelHealthDueRow[]> {
  const client = requireSupabase();
  const [dogsRes, vaxRes, wormRes] = await Promise.all([
    client.from('dogs').select('id, name').neq('status', 'deceased').is('deceased_at', null),
    client.from('vaccinations').select(VAX_SELECT).not('next_due_date', 'is', null),
    client.from('deworming_records').select(WORM_SELECT).not('next_due_date', 'is', null),
  ]);
  if (dogsRes.error) throw new Error(dogsRes.error.message);
  if (vaxRes.error) throw new Error(vaxRes.error.message);
  if (wormRes.error) throw new Error(wormRes.error.message);

  const dogs = dogsRes.data ?? [];
  const vaxByDog = new Map<string, VaccinationLike[]>();
  const wormByDog = new Map<string, DewormingLike[]>();
  for (const row of (vaxRes.data ?? []) as (VaccinationLike & { dog_id: string })[]) {
    const list = vaxByDog.get(row.dog_id) ?? [];
    list.push(row);
    vaxByDog.set(row.dog_id, list);
  }
  for (const row of (wormRes.data ?? []) as (DewormingLike & { dog_id: string })[]) {
    const list = wormByDog.get(row.dog_id) ?? [];
    list.push(row);
    wormByDog.set(row.dog_id, list);
  }

  const rows: KennelHealthDueRow[] = [];
  for (const dog of dogs) {
    const calendar = buildHealthCalendar(vaxByDog.get(dog.id) ?? [], wormByDog.get(dog.id) ?? []);
    for (const item of calendar.upcoming) {
      rows.push({
        ...item,
        id: `${dog.id}-${item.id}`,
        dogId: dog.id,
        dogName: dog.name,
        dueLabel: upcomingDueLabel(item),
      });
    }
  }
  rows.sort((a, b) => a.daysUntil - b.daysUntil || a.dogName.localeCompare(b.dogName));
  return rows;
}
