import { useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Application } from '@/types/app.types';
import type { TablesInsert } from '@/types/database.types';

export type ApplicationDraft = Omit<
  Application,
  'id' | 'status' | 'admin_notes' | 'reviewed_by' | 'reviewed_at' | 'created_at' | 'updated_at'
>;

interface SubmitResult {
  referenceId: string | null;
  error: string | null;
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

  async function submit(draft: ApplicationDraft): Promise<SubmitResult> {
    setSubmitting(true);
    try {
      if (!supabase) {
        await new Promise((r) => setTimeout(r, 600));
        return { referenceId: `DD-${Date.now().toString().slice(-6)}`, error: null };
      }

      const { data, error } = await supabase
        .from('applications')
        .insert(draft satisfies TablesInsert<'applications'>)
        .select('id')
        .single();
      if (error) return { referenceId: null, error: error.message };

      const referenceId = `DD-${(data as { id: string }).id.slice(0, 8).toUpperCase()}`;
      void logEnquiry(draft, referenceId);

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) void logClientNotification(userData.user.id, referenceId);

      return { referenceId, error: null };
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting };
}
