import { useState } from 'react';

import { supabase } from '@/lib/supabase';
import { ensureWaitlistOnApplicationSubmitted } from '@/lib/waitlist/syncFromApplication';
import type { Application } from '@/types/app.types';
import type { TablesInsert } from '@/types/database.types';

export type ApplicationDraft = Omit<
  Application,
  | 'id'
  | 'status'
  | 'admin_notes'
  | 'reviewed_by'
  | 'reviewed_at'
  | 'created_at'
  | 'updated_at'
  | 'archived_at'
  | 'archived_by'
  | 'archived_reason'
>;

interface SubmitResult {
  referenceId: string | null;
  error: string | null;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function logEnquiry(draft: ApplicationDraft, referenceId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('enquiries').insert({
    subject: `Application Received — ${referenceId}`,
    message: `A new puppy application has been submitted. Reference: ${referenceId}. Applicant: ${draft.full_name}, ${draft.email}, ${draft.phone}.`,
    full_name: draft.full_name,
    email: draft.email,
    phone: draft.phone ?? null,
    country: draft.country ?? null,
    status: 'new',
  });
  if (error) console.error('[useSubmitApplication] enquiry:', error.message);
}

async function logClientNotification(userId: string, referenceId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('notifications_log').insert({
    recipient_id: userId,
    subject: 'Application Submitted',
    body: `Your application has been received. Your reference number is ${referenceId}. We will review it and contact you soon.`,
    type: 'application_confirmation',
    status: 'sent',
  });
  if (error) console.error('[useSubmitApplication] notification:', error.message);
}

/** Handles public application submission. */
export function useSubmitApplication() {
  const [submitting, setSubmitting] = useState(false);

  async function submit(
    draft: ApplicationDraft,
    marketingOptIn?: boolean,
  ): Promise<SubmitResult> {
    setSubmitting(true);
    try {
      if (!supabase) {
        await new Promise((r) => setTimeout(r, 600));
        return { referenceId: `DD-${Date.now().toString().slice(-6)}`, error: null };
      }

      // Generate the reference client-side BEFORE inserting, and store it on the
      // row itself (reference_code). We deliberately do NOT chain .select() after
      // the insert: a public applicant has no SELECT permission on `applications`
      // (admin-only read policy), so reading the row back would be blocked by RLS
      // and reported as "new row violates row-level security policy" — which is
      // exactly why submissions silently failed before. Insert-only avoids that.
      const referenceId = `DD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const applicationId = newId();

      // Cast: reference_code was just added to the table; regenerate
      // database.types.ts (npm run gen:types) to drop this cast.
      const insertRow = {
        ...draft,
        id: applicationId,
        reference_code: referenceId,
      } as TablesInsert<'applications'>;
      const { error } = await supabase.from('applications').insert(insertRow);
      if (error) {
        console.error('[useSubmitApplication] insert:', error);
        return { referenceId: null, error: error.message };
      }

      if (marketingOptIn) {
        const { error: consentErr } = await supabase.rpc('record_marketing_consent' as never, {
          p_email: draft.email,
          p_opt_in: true,
          p_source: 'application_form',
          p_full_name: draft.full_name,
          p_phone: draft.phone,
          p_user_id: draft.user_id,
        } as never);
        if (consentErr) console.error('[useSubmitApplication] marketing consent:', consentErr.message);
      }

      // Best-effort follow-ups. Neither should ever block the applicant from
      // seeing their reference number — the application already saved above.
      try {
        void logEnquiry(draft, referenceId);
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) void logClientNotification(userData.user.id, referenceId);
        void ensureWaitlistOnApplicationSubmitted({
          id: applicationId,
          user_id: userData.user?.id ?? draft.user_id ?? null,
          full_name: draft.full_name,
          email: draft.email,
          phone: draft.phone,
          country: draft.country,
          dog_interest: draft.dog_interest,
          preferred_sex: draft.preferred_sex,
          preferred_colour: draft.preferred_colour,
          tail_preference: draft.tail_preference,
          budget_range: draft.budget_range,
          preferred_timeline: draft.preferred_timeline,
          special_requests: draft.special_requests,
          why_dobermann: draft.why_dobermann,
        }).then(({ error: wlErr }) => {
          if (wlErr) console.error('[useSubmitApplication] waitlist seed:', wlErr);
        });
      } catch (followUpErr) {
        console.error('[useSubmitApplication] follow-up:', followUpErr);
      }

      return { referenceId, error: null };
    } catch (e) {
      // Previously uncaught — any thrown error here (network failure, etc.)
      // vanished silently: the spinner stopped but nothing else happened.
      console.error('[useSubmitApplication] submit threw:', e);
      const message =
        e instanceof Error && e.message ? e.message : 'Could not submit — check your connection and try again.';
      return { referenceId: null, error: message };
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting };
}
