import { useState } from 'react';

import { applyCouldNot, ERROR_CODES, logApplyFailure, safeDbReason, stackFrom } from '@/lib/applications/applyErrors';
import { MARKETING_SOURCES } from '@/lib/marketing/sources';
import {
  APPLICATION_RATE_DAY,
  APPLICATION_RATE_HOUR,
  ENQUIRY_RATE_HOUR,
  RateLimitError,
  assertRateLimit,
  blockedMessage,
  isRateLimitDbError,
} from '@/lib/security/rateLimit';
import { getCachedUser } from '@/lib/auth/getCachedUser';
import { supabase } from '@/lib/supabase';
import type { Application } from '@/types/app.types';
import type { TablesInsert } from '@/types/database.types';
import { postApplicationFiles, type PickedApplicationFile } from '@/lib/uploads/applicationFiles';

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
  try {
    await assertRateLimit('enquiry', ENQUIRY_RATE_HOUR, 3600);
  } catch {
    return;
  }
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
    files: PickedApplicationFile[] = [],
  ): Promise<SubmitResult> {
    setSubmitting(true);
    try {
      if (!supabase) {
        await new Promise((r) => setTimeout(r, 600));
        return { referenceId: `DD-${Date.now().toString().slice(-6)}`, error: null };
      }

      try {
        await assertRateLimit('application', APPLICATION_RATE_HOUR, 3600);
        await assertRateLimit('application_day', APPLICATION_RATE_DAY, 86400);
      } catch (e) {
        const message = e instanceof RateLimitError ? e.message : await blockedMessage();
        await logApplyFailure({
          code: ERROR_CODES.APPLY_RATE_LIMITED,
          message: 'App apply rate limited',
          body: draft,
          extra: { step_reached: 'rate_limit', sqlstate: 'P0001' },
          severity: 'warning',
        });
        return { referenceId: null, error: message };
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
        const limited = isRateLimitDbError(error);
        await logApplyFailure({
          code: limited ? ERROR_CODES.APPLY_RATE_LIMITED : ERROR_CODES.APPLY_DB_ERROR,
          message: 'App apply insert failed',
          body: draft,
          extra: { step_reached: 'insert', sqlstate: error.code ?? null },
          severity: limited ? 'warning' : 'error',
        });
        return {
          referenceId: null,
          error: limited ? await blockedMessage() : applyCouldNot(safeDbReason(error)),
        };
      }

      if (files.length > 0) {
        const uploaded = await postApplicationFiles({
          applicationId,
          email: draft.email,
          files,
        });
        if (uploaded.error) {
          console.error('[useSubmitApplication] files:', uploaded.error);
          await logApplyFailure({
            code: ERROR_CODES.APPLY_UPLOAD_FAILED,
            message: 'App apply file upload failed after insert',
            body: draft,
            extra: { step_reached: 'file_store', reason: uploaded.error, reference_present: true },
            severity: 'warning',
          });
        }
      }

      if (marketingOptIn) {
        const { error: consentErr } = await supabase.rpc('record_marketing_consent' as never, {
          p_email: draft.email,
          p_opt_in: true,
          p_source: MARKETING_SOURCES.applicationForm,
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
        const user = await getCachedUser();
        if (user) void logClientNotification(user.id, referenceId);
      } catch (followUpErr) {
        console.error('[useSubmitApplication] follow-up:', followUpErr);
      }

      return { referenceId, error: null };
    } catch (e) {
      // Previously uncaught — any thrown error here (network failure, etc.)
      // vanished silently: the spinner stopped but nothing else happened.
      console.error('[useSubmitApplication] submit threw:', e);
      await logApplyFailure({
        code: ERROR_CODES.APPLY_UNHANDLED,
        message: 'App apply unhandled exception',
        extra: { step_reached: 'unhandled', stack: stackFrom(e) },
      });
      return { referenceId: null, error: applyCouldNot('something went wrong on our side') };
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting };
}
