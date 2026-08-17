import { requireSupabase } from '@/lib/supabase';
import { parseHistoricDob } from '@/lib/identity/dob';
import { parseSaId } from '@/lib/identity/idNumber';

export async function overrideIdCheck(
  applicationId: string,
  actorId: string,
  actorName: string,
  note: string,
): Promise<{ error: string | null }> {
  const reason = note.trim();
  if (reason.length < 4) return { error: 'Say why you are overriding the format check.' };
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('applications')
    .update({
      id_check_status: 'manual_override',
      id_check_note: `${reason} — ${actorName}`,
    } as never)
    .eq('id', applicationId);
  if (error) return { error: error.message };

  const { error: eventError } = await supabase.from('application_events' as never).insert({
    application_id: applicationId,
    event_type: 'id_check_override',
    message: reason,
    created_by: actorId,
  } as never);
  if (eventError) console.error('[overrideIdCheck] event:', eventError.message);
  return { error: null };
}

export async function applyEmbeddedIdDob(
  applicationId: string,
  actorId: string,
): Promise<{ error: string | null }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('applications')
    .select('id_number, date_of_birth')
    .eq('id', applicationId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Application not found.' };

  const parsed = parseSaId(data.id_number);
  if (!parsed) return { error: 'This number is not a valid South African ID.' };
  const historic = parseHistoricDob(data.date_of_birth);
  if (historic.kind === 'iso') {
    return { error: 'The stored date is already a real date — it was not overwritten.' };
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update({ date_of_birth: parsed.dobIso } as never)
    .eq('id', applicationId);
  if (updateError) return { error: updateError.message };

  const { error: eventError } = await supabase.from('application_events' as never).insert({
    application_id: applicationId,
    event_type: 'note',
    message: `Date of birth set from the ID's embedded date (${parsed.dobIso}).`,
    created_by: actorId,
  } as never);
  if (eventError) console.error('[applyEmbeddedIdDob] event:', eventError.message);
  return { error: null };
}
