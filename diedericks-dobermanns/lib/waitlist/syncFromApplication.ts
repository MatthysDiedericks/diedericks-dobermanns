/**
 * Promote / sync an approved application onto the waiting list, copying
 * preferences without overwriting hand-entered values.
 */
import { categoryFromDogInterest } from '@/lib/waitlist/helpers';
import { buildForwardStagePatch } from '@/lib/waitlist/pipeline';
import { supabase } from '@/lib/supabase';
import type { Application } from '@/types/app.types';
import type { TablesUpdate } from '@/types/database.types';

function emptyOrDefault(value: string | null | undefined, defaults: string[] = []): boolean {
  if (value == null || value.trim() === '') return true;
  return defaults.includes(value);
}

/** Fill only blank waitlist preference fields from the application. */
export function prefsFromApplication(
  app: Pick<
    Application,
    | 'preferred_sex'
    | 'preferred_colour'
    | 'tail_preference'
    | 'budget_range'
    | 'preferred_timeline'
    | 'dog_interest'
    | 'special_requests'
    | 'why_dobermann'
  >,
  existing?: {
    preferred_sex?: string | null;
    preferred_colour?: string | null;
    tail_preference?: string | null;
    budget_range?: string | null;
    preferred_timeline?: string | null;
    preferred_category?: string | null;
    preference_notes?: string | null;
  },
): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  if (emptyOrDefault(existing?.preferred_sex, ['any', 'no_preference']) && app.preferred_sex) {
    patch.preferred_sex = app.preferred_sex;
  }
  if (
    emptyOrDefault(existing?.preferred_colour, ['no_preference', 'any']) &&
    app.preferred_colour
  ) {
    patch.preferred_colour = app.preferred_colour;
  }
  if (
    emptyOrDefault(existing?.tail_preference, ['no_preference', 'any']) &&
    app.tail_preference
  ) {
    patch.tail_preference = app.tail_preference;
  }
  if (emptyOrDefault(existing?.budget_range) && app.budget_range) {
    patch.budget_range = app.budget_range;
  }
  if (emptyOrDefault(existing?.preferred_timeline) && app.preferred_timeline) {
    patch.preferred_timeline = app.preferred_timeline;
  }
  if (emptyOrDefault(existing?.preferred_category, ['any'])) {
    patch.preferred_category = categoryFromDogInterest(app.dog_interest);
  }
  if (emptyOrDefault(existing?.preference_notes)) {
    patch.preference_notes = app.special_requests ?? app.why_dobermann ?? null;
  }
  return patch;
}

/**
 * Submit no longer seeds the waiting list. A recorded payment is required
 * (migration 0146). Kept as a no-op so older call sites compile.
 */
export async function ensureWaitlistOnApplicationSubmitted(
  _app: Pick<Application, 'id'>,
): Promise<{ error: string | null; waitlistId?: string }> {
  return { error: null };
}

/**
 * On approval: if a waitlist row already exists (legacy, or a payment already
 * landed), copy blank preference fields forward. Never inserts — payment-time
 * promote_waitlist_on_payment owns creation.
 */
export async function syncWaitlistOnApplicationApproved(
  applicationId: string,
  actorId: string | null,
): Promise<{ error: string | null; waitlistId?: string }> {
  if (!supabase) return { error: null };

  const { data: app, error: appErr } = await supabase
    .from('applications')
    .select(
      'id, user_id, full_name, email, phone, country, dog_interest, preferred_sex, preferred_colour, tail_preference, budget_range, preferred_timeline, special_requests, why_dobermann',
    )
    .eq('id', applicationId)
    .single();
  if (appErr || !app) return { error: appErr?.message ?? 'Application not found' };

  const { data: existing } = await supabase
    .from('waiting_list')
    .select(
      'id, pipeline_stage, preferred_sex, preferred_colour, tail_preference, budget_range, preferred_timeline, preferred_category, preference_notes',
    )
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing) return { error: null };

  const prefs = prefsFromApplication(app, existing);
  const stagePatch = buildForwardStagePatch(
    existing.pipeline_stage ?? 'enquiry',
    'approved',
    actorId,
    { status: 'active', stage_change_note: 'Application approved' },
  );

  const update: TablesUpdate<'waiting_list'> = {
    ...prefs,
    ...(stagePatch ?? {}),
  };
  const { error } = await supabase.from('waiting_list').update(update).eq('id', existing.id);
  return { error: error?.message ?? null, waitlistId: existing.id };
}
