import { addDays, formatISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { notifyCalendarRefresh } from '@/lib/calendar/refresh';
import {
  CALENDAR_EVENT_SELECT,
  DEWORMING_SELECT,
  HEALTH_DOG_SELECT,
  HEALTH_PRODUCT_SELECT,
  VACCINATION_SELECT,
  VET_PRACTICE_SELECT,
  VET_VISIT_SELECT,
} from '@/lib/health/constants';
import { daysUntilDate } from '@/lib/health/dueStatus';
import type {
  CalendarEventRow,
  DewormingRecord,
  DogDewormingSummary,
  DogVaccinationSummary,
  DogVetSummary,
  HealthDog,
  HealthProduct,
  HealthProductCategory,
  UpcomingHealthEvent,
  VaccinationRecord,
  VetPractice,
  VetVisitRecord,
} from '@/lib/health/types';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

function toVisitTimestamp(date: string): string {
  return date.includes('T') ? date : `${date}T12:00:00.000Z`;
}

function mapHealthDog(row: Record<string, unknown>): HealthDog {
  const media = (row.dog_media as { url: string; is_primary: boolean }[] | null) ?? [];
  const primary = media.find((m) => m.is_primary) ?? media[0];
  return {
    id: row.id as string,
    name: row.name as string,
    photoUrl: primary?.url ?? null,
  };
}

function eventTypeFromDeworm(t: string): UpcomingHealthEvent['eventType'] {
  if (t === 'tick_flea') return 'tick_flea';
  return 'deworming';
}

// ─── Product library ───────────────────────────────────────────────────────

export function useHealthProducts(category?: HealthProductCategory) {
  const [products, setProducts] = useState<HealthProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let q = requireSupabase()
        .from('health_products')
        .select(HEALTH_PRODUCT_SELECT)
        .eq('is_active', true)
        .order('product_name');
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      setProducts((data ?? []) as HealthProduct[]);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { products, loading, refresh };
}

export function useAddHealthProduct() {
  return useCallback(
    async (input: {
      product_name: string;
      category: HealthProductCategory;
      manufacturer?: string | null;
      default_schedule_type?: string | null;
    }) => {
      const { data, error } = await requireSupabase()
        .from('health_products')
        .insert({
          product_name: input.product_name,
          category: input.category,
          manufacturer: input.manufacturer ?? null,
          default_schedule_type: input.default_schedule_type ?? 'annual',
          is_active: true,
        })
        .select(HEALTH_PRODUCT_SELECT)
        .single();
      if (error) throw new Error(error.message);
      showSaved();
      return data as HealthProduct;
    },
    [],
  );
}

// ─── Vet practices ─────────────────────────────────────────────────────────

export function useVetPractices() {
  const [practices, setPractices] = useState<VetPractice[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await requireSupabase()
        .from('vet_practices')
        .select(VET_PRACTICE_SELECT)
        .order('practice_name');
      if (error) throw error;
      setPractices((data ?? []) as VetPractice[]);
    } catch {
      setPractices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { practices, loading, refresh };
}

export function useAddVetPractice() {
  return useCallback(
    async (input: {
      practice_name: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      vet_names?: string[];
    }) => {
      const { data, error } = await requireSupabase()
        .from('vet_practices')
        .insert({
          practice_name: input.practice_name,
          phone: input.phone ?? null,
          email: input.email ?? null,
          address: input.address ?? null,
          vet_names: input.vet_names ?? [],
        })
        .select(VET_PRACTICE_SELECT)
        .single();
      if (error) throw new Error(error.message);
      showSaved();
      return data as VetPractice;
    },
    [],
  );
}

export function useUpdateVetPractice() {
  return useCallback(async (id: string, patch: Partial<VetPractice>) => {
    const { error } = await requireSupabase().from('vet_practices').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    showSaved();
  }, []);
}

export function useAddDoctorToPractice() {
  return useCallback(async (practiceId: string, doctorName: string, currentNames: string[]) => {
    const names = [...new Set([...(currentNames ?? []), doctorName.trim()])];
    const { error } = await requireSupabase()
      .from('vet_practices')
      .update({ vet_names: names })
      .eq('id', practiceId);
    if (error) throw new Error(error.message);
    showSaved();
    return names;
  }, []);
}

// ─── Active breeding dogs ──────────────────────────────────────────────────

export function useBreedingDogsForHealth() {
  const [dogs, setDogs] = useState<HealthDog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await requireSupabase()
        .from('dogs')
        .select(HEALTH_DOG_SELECT)
        .in('status', ['keep', 'stud'])
        .order('name');
      if (error) throw error;
      setDogs((data ?? []).map((r) => mapHealthDog(r as Record<string, unknown>)));
    } catch {
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dogs, loading, refresh };
}

// ─── Per-dog records ───────────────────────────────────────────────────────

export function useVaccinationsForDog(dogId: string) {
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('vaccinations')
        .select(VACCINATION_SELECT)
        .eq('dog_id', dogId)
        .order('date_administered', { ascending: false });
      if (err) throw new Error(err.message);
      setVaccinations((data ?? []) as VaccinationRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vaccinations');
      setVaccinations([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveVaccination = useCallback(
    async (
      input: Partial<VaccinationRecord> & {
        dog_id: string;
        vaccine_name: string;
        date_administered: string;
        schedule_type?: string;
      },
      id?: string,
    ) => {
      const scheduleType =
        input.schedule_type ?? (input.next_due_date ? 'custom' : 'annual');
      const payload: TablesInsert<'vaccinations'> = {
        dog_id: input.dog_id,
        vaccine_name: input.vaccine_name,
        date_administered: input.date_administered,
        schedule_type: scheduleType,
        doctor_name: input.doctor_name ?? null,
        administered_by: input.doctor_name ?? input.administered_by ?? null,
        vet_practice_id: input.vet_practice_id ?? null,
        health_product_id: input.health_product_id ?? null,
        batch_number: input.batch_number ?? null,
        notes: input.notes ?? null,
      };
      if (scheduleType === 'custom' && input.next_due_date) {
        payload.next_due_date = input.next_due_date;
      }

      const client = requireSupabase();
      const { data, error: err } = id
        ? await client.from('vaccinations').update(payload as TablesUpdate<'vaccinations'>).eq('id', id).select(VACCINATION_SELECT).single()
        : await client.from('vaccinations').insert(payload).select(VACCINATION_SELECT).single();
      if (err) throw new Error(err.message);
      showSaved();
      notifyCalendarRefresh();
      await refresh();
      return data as VaccinationRecord;
    },
    [dogId, refresh],
  );

  const deleteVaccination = useCallback(
    async (id: string) => {
      const { error: err } = await requireSupabase().from('vaccinations').delete().eq('id', id);
      if (err) throw new Error(err.message);
      showSaved();
      await refresh();
    },
    [refresh],
  );

  return { vaccinations, loading, error, refresh, saveVaccination, deleteVaccination, addVaccination: saveVaccination };
}

export function useDewormingForDog(dogId: string) {
  const [records, setRecords] = useState<DewormingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('deworming_records')
        .select(DEWORMING_SELECT)
        .contains('dog_ids', [dogId])
        .order('date_treated', { ascending: false });
      if (err) throw new Error(err.message);
      setRecords((data ?? []) as DewormingRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load deworming records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveRecord = useCallback(
    async (
      input: {
        dog_id: string;
        product_name: string;
        date_treated: string;
        treatment_type: string;
        schedule_type: string;
        doctor_name?: string | null;
        vet_practice_id?: string | null;
        health_product_id?: string | null;
        weight_kg?: number | null;
        notes?: string | null;
        next_due_date?: string | null;
      },
      id?: string,
    ) => {
      const payload: TablesInsert<'deworming_records'> = {
        dog_ids: [input.dog_id],
        product_name: input.product_name,
        date_treated: input.date_treated,
        treatment_type: input.treatment_type,
        schedule_type: input.schedule_type ?? 'quarterly',
        doctor_name: input.doctor_name ?? null,
        vet_practice_id: input.vet_practice_id ?? null,
        health_product_id: input.health_product_id ?? null,
        weight_kg: input.weight_kg ?? null,
        notes: input.notes ?? null,
      };
      if (input.schedule_type === 'custom' && input.next_due_date) {
        payload.next_due_date = input.next_due_date;
      }

      const client = requireSupabase();
      const { error: err } = id
        ? await client.from('deworming_records').update(payload as TablesUpdate<'deworming_records'>).eq('id', id)
        : await client.from('deworming_records').insert(payload);
      if (err) throw new Error(err.message);
      showSaved();
      notifyCalendarRefresh();
      await refresh();
    },
    [refresh],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      const { error: err } = await requireSupabase().from('deworming_records').delete().eq('id', id);
      if (err) throw new Error(err.message);
      showSaved();
      await refresh();
    },
    [refresh],
  );

  return { records, loading, error, refresh, saveRecord, deleteRecord };
}

export function useVetVisitsForDog(dogId: string) {
  const [visits, setVisits] = useState<VetVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('vet_visits')
        .select(VET_VISIT_SELECT)
        .eq('dog_id', dogId)
        .order('visit_date', { ascending: false });
      if (err) throw new Error(err.message);
      setVisits((data ?? []) as VetVisitRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vet visits');
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveVisit = useCallback(
    async (
      input: {
        dog_id: string;
        visit_date: string;
        reason: string;
        schedule_type?: string;
        doctor_name?: string | null;
        vet_name?: string | null;
        vet_clinic?: string | null;
        vet_practice_id?: string | null;
        diagnosis?: string | null;
        treatment?: string | null;
        medications?: string | null;
        cost?: number | null;
        notes?: string | null;
        next_due_date?: string | null;
        follow_up_date?: string | null;
      },
      id?: string,
    ) => {
      const practice = input.vet_practice_id
        ? await requireSupabase()
            .from('vet_practices')
            .select('practice_name')
            .eq('id', input.vet_practice_id)
            .maybeSingle()
        : { data: null };

      const payload: TablesInsert<'vet_visits'> = {
        dog_id: input.dog_id,
        visit_date: toVisitTimestamp(input.visit_date),
        reason: input.reason,
        schedule_type: input.schedule_type ?? 'none',
        doctor_name: input.doctor_name ?? input.vet_name ?? null,
        vet_name: input.doctor_name ?? input.vet_name ?? null,
        vet_practice_id: input.vet_practice_id ?? null,
        vet_clinic: input.vet_clinic ?? practice.data?.practice_name ?? null,
        diagnosis: input.diagnosis ?? null,
        treatment: input.treatment ?? null,
        medications: input.medications ?? null,
        cost: input.cost ?? null,
        notes: input.notes ?? null,
        follow_up_required: input.schedule_type !== 'none',
      };
      if (input.schedule_type === 'custom') {
        payload.next_due_date = input.next_due_date ?? input.follow_up_date ?? null;
        payload.follow_up_date = input.follow_up_date ?? input.next_due_date ?? null;
      }

      const client = requireSupabase();
      const { error: err } = id
        ? await client.from('vet_visits').update(payload as TablesUpdate<'vet_visits'>).eq('id', id)
        : await client.from('vet_visits').insert(payload);
      if (err) throw new Error(err.message);
      showSaved();
      notifyCalendarRefresh();
      await refresh();
    },
    [refresh],
  );

  const deleteVisit = useCallback(
    async (id: string) => {
      const { error: err } = await requireSupabase().from('vet_visits').delete().eq('id', id);
      if (err) throw new Error(err.message);
      showSaved();
      await refresh();
    },
    [refresh],
  );

  return { visits, loading, error, refresh, saveVisit, deleteVisit, addVisit: saveVisit };
}

// ─── Summaries for health hub ──────────────────────────────────────────────

export function useHealthSummaries() {
  const { dogs, loading: dogsLoading, refresh: refreshDogs } = useBreedingDogsForHealth();
  const [vaccinationSummaries, setVaccinationSummaries] = useState<DogVaccinationSummary[]>([]);
  const [dewormingSummaries, setDewormingSummaries] = useState<DogDewormingSummary[]>([]);
  const [vetSummaries, setVetSummaries] = useState<DogVetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    await refreshDogs();
    try {
      const client = requireSupabase();
      const [vacs, deworms, visits, dogsRes] = await Promise.all([
        client.from('vaccinations').select(`${VACCINATION_SELECT}`).order('date_administered', { ascending: false }),
        client.from('deworming_records').select(DEWORMING_SELECT).order('date_treated', { ascending: false }),
        client.from('vet_visits').select(VET_VISIT_SELECT).order('visit_date', { ascending: false }),
        client.from('dogs').select(HEALTH_DOG_SELECT).in('status', ['keep', 'stud']).order('name'),
      ]);

      const dogList = (dogsRes.data ?? []).map((r) => mapHealthDog(r as Record<string, unknown>));
      const vacByDog = new Map<string, VaccinationRecord>();
      for (const v of (vacs.data ?? []) as VaccinationRecord[]) {
        if (!vacByDog.has(v.dog_id)) vacByDog.set(v.dog_id, v);
      }

      setVaccinationSummaries(
        dogList.map((dog) => {
          const latest = vacByDog.get(dog.id);
          return {
            dog,
            lastVaccine: latest?.vaccine_name ?? null,
            lastDate: latest?.date_administered ?? null,
            nextDue: latest?.next_due_date ?? null,
          };
        }),
      );

      setDewormingSummaries(
        dogList.map((dog) => {
          const dogRecords = ((deworms.data ?? []) as DewormingRecord[]).filter((r) =>
            r.dog_ids?.includes(dog.id),
          );
          const deworm = dogRecords.find((r) => r.treatment_type === 'deworming' || r.treatment_type === 'both');
          const tick = dogRecords.find((r) => r.treatment_type === 'tick_flea' || r.treatment_type === 'both');
          return {
            dog,
            lastDeworm: deworm?.product_name ?? null,
            lastDewormDate: deworm?.date_treated ?? null,
            nextDewormDue: deworm?.next_due_date ?? null,
            lastTickFlea: tick?.product_name ?? null,
            lastTickFleaDate: tick?.date_treated ?? null,
            nextTickFleaDue: tick?.next_due_date ?? null,
          };
        }),
      );

      const visitByDog = new Map<string, VetVisitRecord>();
      for (const v of (visits.data ?? []) as VetVisitRecord[]) {
        if (v.dog_id && !visitByDog.has(v.dog_id)) visitByDog.set(v.dog_id, v);
      }

      setVetSummaries(
        dogList.map((dog) => {
          const latest = visitByDog.get(dog.id);
          return {
            dog,
            lastVisitDate: latest?.visit_date ?? null,
            lastReason: latest?.reason ?? null,
            nextDue: latest?.next_due_date ?? latest?.follow_up_date ?? null,
          };
        }),
      );
    } catch {
      setVaccinationSummaries([]);
      setDewormingSummaries([]);
      setVetSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [refreshDogs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    dogs,
    vaccinationSummaries,
    dewormingSummaries,
    vetSummaries,
    loading: loading || dogsLoading,
    refresh,
  };
}

// ─── Upcoming events ───────────────────────────────────────────────────────

export function useUpcomingHealthEvents(daysAhead = 30) {
  const [events, setEvents] = useState<UpcomingHealthEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const today = formatISO(new Date(), { representation: 'date' });
    const end = formatISO(addDays(new Date(), daysAhead), { representation: 'date' });

    try {
      const client = requireSupabase();
      const { data: calRows, error: calErr } = await client
        .from('calendar_events')
        .select(`${CALENDAR_EVENT_SELECT}, dog:dogs(id, name, dog_media(url, is_primary))`)
        .eq('is_completed', false)
        .gte('event_date', today)
        .lte('event_date', end)
        .order('event_date');

      if (!calErr && calRows?.length) {
        setEvents(
          (calRows as Record<string, unknown>[]).map((row) => {
            const dog = row.dog as Record<string, unknown> | null;
            const hd = dog ? mapHealthDog(dog) : null;
            const days = daysUntilDate(row.event_date as string);
            return {
              id: row.id as string,
              dogId: (row.dog_id as string) ?? hd?.id ?? '',
              dogName: hd?.name ?? 'Dog',
              photoUrl: hd?.photoUrl ?? null,
              eventType: (row.event_type as UpcomingHealthEvent['eventType']) ?? 'vaccination',
              eventLabel: (row.title as string) ?? String(row.event_type),
              dueDate: row.event_date as string,
              daysUntil: days,
              sourceTable: 'calendar_events' as const,
              sourceId: row.id as string,
              urgency: days < 0 ? 'overdue' : days < 7 ? 'critical' : days <= 14 ? 'soon' : 'month',
            };
          }),
        );
        return;
      }

      const [dogsRes, vacs, deworms, visits] = await Promise.all([
        client.from('dogs').select(HEALTH_DOG_SELECT).in('status', ['keep', 'stud']),
        client.from('vaccinations').select(`${VACCINATION_SELECT}`).not('next_due_date', 'is', null).lte('next_due_date', end),
        client.from('deworming_records').select(DEWORMING_SELECT).not('next_due_date', 'is', null).lte('next_due_date', end),
        client.from('vet_visits').select(VET_VISIT_SELECT).not('follow_up_date', 'is', null).lte('follow_up_date', end),
      ]);

      const dogMap = new Map(
        (dogsRes.data ?? []).map((d) => [d.id as string, mapHealthDog(d as Record<string, unknown>)]),
      );
      const merged: UpcomingHealthEvent[] = [];

      for (const v of (vacs.data ?? []) as VaccinationRecord[]) {
        if (!v.next_due_date || v.next_due_date < today) continue;
        const dog = dogMap.get(v.dog_id);
        const days = daysUntilDate(v.next_due_date);
        merged.push({
          id: `vac-${v.id}`,
          dogId: v.dog_id,
          dogName: dog?.name ?? 'Dog',
          photoUrl: dog?.photoUrl ?? null,
          eventType: 'vaccination',
          eventLabel: v.vaccine_name,
          dueDate: v.next_due_date,
          daysUntil: days,
          sourceTable: 'vaccinations',
          sourceId: v.id,
          urgency: days < 7 ? 'critical' : days <= 14 ? 'soon' : 'month',
        });
      }

      for (const d of (deworms.data ?? []) as DewormingRecord[]) {
        if (!d.next_due_date || d.next_due_date < today) continue;
        const dogId = d.dog_ids?.[0];
        if (!dogId) continue;
        const dog = dogMap.get(dogId);
        const days = daysUntilDate(d.next_due_date);
        merged.push({
          id: `dew-${d.id}`,
          dogId,
          dogName: dog?.name ?? 'Dog',
          photoUrl: dog?.photoUrl ?? null,
          eventType: eventTypeFromDeworm(d.treatment_type),
          eventLabel: d.product_name ?? 'Treatment',
          dueDate: d.next_due_date,
          daysUntil: days,
          sourceTable: 'deworming_records',
          sourceId: d.id,
          urgency: days < 7 ? 'critical' : days <= 14 ? 'soon' : 'month',
        });
      }

      for (const v of (visits.data ?? []) as VetVisitRecord[]) {
        const due = v.next_due_date ?? v.follow_up_date;
        if (!due || !v.dog_id || due < today || due > end) continue;
        const dog = dogMap.get(v.dog_id);
        const days = daysUntilDate(due);
        merged.push({
          id: `vet-${v.id}`,
          dogId: v.dog_id,
          dogName: dog?.name ?? 'Dog',
          photoUrl: dog?.photoUrl ?? null,
          eventType: 'vet_visit',
          eventLabel: v.reason,
          dueDate: due,
          daysUntil: days,
          sourceTable: 'vet_visits',
          sourceId: v.id,
          urgency: days < 7 ? 'critical' : days <= 14 ? 'soon' : 'month',
        });
      }

      merged.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      setEvents(merged);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [daysAhead]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { events, loading, refresh };
}

// ─── Legacy list hooks (backward compat) ───────────────────────────────────

export function useVaccinations() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await requireSupabase()
      .from('vaccinations')
      .select('id, dog_id, vaccine_name, date_administered, next_due_date, administered_by, batch_number, notes, dog:dogs(name)')
      .order('next_due_date', { ascending: true });
    setData(rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

export function useVaccination(id: string) {
  const [vaccination, setVaccination] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('vaccinations')
        .select('id, vaccine_name, date_administered, next_due_date, administered_by, notes, dog_id, batch_number, dog:dogs(name)')
        .eq('id', id)
        .single();
      if (err) throw new Error(err.message);
      setVaccination(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vaccination');
      setVaccination(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { vaccination, loading, error, refresh };
}

export function useDewormingRecords() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await requireSupabase()
        .from('deworming_records')
        .select(DEWORMING_SELECT)
        .order('next_due_date', { ascending: true });
      setData(rows ?? []);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

export function useVetVisits() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await requireSupabase()
        .from('vet_visits')
        .select(`${VET_VISIT_SELECT}, dog:dogs(name)`)
        .order('visit_date', { ascending: false });
      setData(rows ?? []);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

export function useVetVisit(id: string) {
  const [vetVisit, setVetVisit] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('vet_visits')
        .select(`${VET_VISIT_SELECT}, dog:dogs(id, name)`)
        .eq('id', id)
        .single();
      if (err) throw new Error(err.message);
      setVetVisit(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vet visit');
      setVetVisit(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { vetVisit, loading, error, refresh };
}

export function useUpdateHealthProduct() {
  return useCallback(async (id: string, patch: Partial<HealthProduct>) => {
    const { error } = await requireSupabase().from('health_products').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    showSaved();
  }, []);
}

export function useAllHealthProducts() {
  const [products, setProducts] = useState<HealthProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await requireSupabase()
        .from('health_products')
        .select(HEALTH_PRODUCT_SELECT)
        .order('category')
        .order('product_name');
      if (error) throw error;
      setProducts((data ?? []) as HealthProduct[]);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { products, loading, refresh };
}
