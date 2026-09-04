import { useCallback, useEffect, useState } from 'react';

import type { CheckInKind, DueCheckIn, OverallHealth } from '@/lib/followUps/types';
import { dogHasKnownOwner } from '@/lib/followUps/contactability';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { getCachedUser } from '@/lib/auth/getCachedUser';
import { requireSupabase } from '@/lib/supabase';

function weekEnd() {
  return new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
}

export function useOwnerFollowUps(kindFilter: CheckInKind | 'all' = 'all') {
  const [items, setItems] = useState<DueCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = requireSupabase()
        .from('check_ins')
        .select(
          `
          id, dog_id, contact_id, kind, due_date, status, draft_message,
          dog:dogs!inner(
            id, name, call_name, date_of_birth, sex, ownership_status,
            do_not_contact, litter_id, owner_id
          ),
          contact:contacts!check_ins_contact_id_fkey(
            id, full_name, phone, whatsapp_number, email
          )
        `,
        )
        .eq('status', 'due')
        .lte('due_date', weekEnd())
        .not('dogs.owner_id', 'is', null)
        .order('due_date', { ascending: true });

      if (kindFilter !== 'all') q = q.eq('kind', kindFilter);

      const { data, error: err } = await q;
      if (err) throw new Error(err.message);
      setItems(((data ?? []) as unknown as DueCheckIn[]).filter((r) => dogHasKnownOwner(r.dog)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load follow-ups');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [kindFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}

export function useDueCheckInCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { count: c, error } = await requireSupabase()
        .from('check_ins')
        .select('id, dog:dogs!inner(owner_id)', { count: 'exact', head: true })
        .eq('status', 'due')
        .lte('due_date', weekEnd())
        .not('dogs.owner_id', 'is', null);
      if (error) throw new Error(error.message);
      setCount(c ?? 0);
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { count, loading, refresh };
}

export function useCheckInMutations() {
  const markSent = useCallback(async (id: string, draft?: string) => {
    const supabase = requireSupabase();
    if (draft != null) {
      await supabase.from('check_ins').update({ draft_message: draft }).eq('id', id);
    }
    const user = await getCachedUser();
    const { error } = await supabase
      .from('check_ins')
      .update({
        status: 'sent',
        channel: 'whatsapp',
        sent_at: new Date().toISOString(),
        handled_by: user?.id ?? null,
      })
      .eq('id', id);
    if (error) {
      showError(error.message);
      throw new Error(error.message);
    }
  }, []);

  const skip = useCallback(
    async (id: string, dogId: string, reason: string, doNotContact: boolean) => {
      const supabase = requireSupabase();
      const user = await getCachedUser();
      const { error } = await supabase
        .from('check_ins')
        .update({
          status: 'skipped',
          response_notes: reason,
          response_at: new Date().toISOString(),
          handled_by: user?.id ?? null,
        })
        .eq('id', id);
      if (error) {
        showError(error.message);
        throw new Error(error.message);
      }
      if (doNotContact) {
        await supabase.from('dogs').update({ do_not_contact: true }).eq('id', dogId);
      }
      showSaved();
    },
    [],
  );

  const updateDraft = useCallback(async (id: string, draft: string) => {
    const { error } = await requireSupabase()
      .from('check_ins')
      .update({ draft_message: draft })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  return { markSent, skip, updateDraft };
}

export type LogResponsePayload = {
  checkInId: string;
  dogId: string;
  contactId: string | null;
  overall: OverallHealth | '';
  weightKg: string;
  dcmScreened: '' | 'yes' | 'no';
  dcmResult: string;
  hipsElbows: string;
  conditions: string;
  vetPractice: string;
  notes: string;
  diedAt: string;
  ageAtDeathMonths: string;
  causeOfDeath: string;
  saveTestimonial: boolean;
  testimonialText: string;
  consentGiven: boolean;
  consentEvidence: string;
};

export function useLogCheckInResponse() {
  return useCallback(async (input: LogResponsePayload) => {
    const supabase = requireSupabase();
    const user = await getCachedUser();
    const userId = user?.id ?? null;
    const overall = input.overall || null;
    const diedAt = input.diedAt || null;
    const weight = input.weightKg.trim() === '' ? null : Number(input.weightKg);
    if (weight != null && (Number.isNaN(weight) || weight <= 0 || weight >= 100)) {
      throw new Error('Weight must be between 0 and 100 kg.');
    }
    const conditions = input.conditions
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const { error: reportErr } = await supabase.from('owner_health_reports').insert({
      dog_id: input.dogId,
      check_in_id: input.checkInId,
      reported_at: new Date().toISOString().slice(0, 10),
      overall,
      weight_kg: weight,
      dcm_screened: input.dcmScreened === '' ? null : input.dcmScreened === 'yes',
      dcm_result: input.dcmResult.trim() || null,
      hips_elbows: input.hipsElbows.trim() || null,
      conditions: conditions.length ? conditions : null,
      died_at: diedAt,
      age_at_death_months:
        input.ageAtDeathMonths.trim() === '' ? null : Number(input.ageAtDeathMonths),
      cause_of_death: input.causeOfDeath.trim() || null,
      vet_practice: input.vetPractice.trim() || null,
      notes: input.notes.trim() || null,
      recorded_by: userId,
    });
    if (reportErr) throw new Error(reportErr.message);

    const { error: ciErr } = await supabase
      .from('check_ins')
      .update({
        status: 'answered',
        channel: 'whatsapp',
        response_at: new Date().toISOString(),
        response_notes: input.notes.trim() || null,
        handled_by: userId,
      })
      .eq('id', input.checkInId);
    if (ciErr) throw new Error(ciErr.message);

    if (overall !== 'deceased' && !diedAt) {
      await supabase
        .from('dogs')
        .update({
          ownership_status: 'with_owner',
          ownership_status_at: new Date().toISOString().slice(0, 10),
        })
        .eq('id', input.dogId);
    }

    if (input.saveTestimonial && input.testimonialText.trim()) {
      const { data: dog } = await supabase
        .from('dogs')
        .select('name, call_name')
        .eq('id', input.dogId)
        .maybeSingle();
      const { data: contact } = input.contactId
        ? await supabase
            .from('contacts')
            .select('full_name')
            .eq('id', input.contactId)
            .maybeSingle()
        : { data: null };

      if (input.consentGiven) {
        await supabase.from('testimonials').insert({
          client_name: contact?.full_name ?? 'Client',
          dog_name: dog?.call_name || dog?.name || null,
          content: input.testimonialText.trim(),
          dog_id: input.dogId,
          contact_id: input.contactId,
          check_in_id: input.checkInId,
          consent_given: true,
          consent_given_at: new Date().toISOString(),
          consent_evidence:
            input.consentEvidence.trim() || 'Recorded from welfare check-in',
          is_approved: false,
          is_featured: false,
        });
      } else {
        const note = `[check-in quote — no publish consent]\n${input.testimonialText.trim()}`;
        await supabase
          .from('check_ins')
          .update({
            response_notes: [input.notes.trim(), note].filter(Boolean).join('\n\n'),
          })
          .eq('id', input.checkInId);
      }
    }

    showSaved();
  }, []);
}
