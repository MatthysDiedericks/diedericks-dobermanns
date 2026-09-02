import { requireSupabase } from '@/lib/supabase';

/** Append-only audit row — never update or delete contract_events. */
export async function recordContractEvent(input: {
  contractId: string;
  eventType: string;
  actorId: string | null;
  actorLabel: string;
  detail?: Record<string, unknown>;
}) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('contract_events').insert({
    contract_id: input.contractId,
    event_type: input.eventType,
    actor_id: input.actorId,
    actor_label: input.actorLabel,
    detail: input.detail ?? {},
  } as never);
  if (error) console.error('[contracts/event]', input.eventType, error.message);
}
