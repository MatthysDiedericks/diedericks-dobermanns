import { contractBlockers } from '@/lib/contracts/contractReadiness';
import { requireSupabase } from '@/lib/supabase';

export async function fetchAllContractsNotReady(): Promise<
  { id: string; label: string; count: number }[]
> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('contracts')
    .select(
      'id, contract_number, body_html, dog_id, client_id, contact_id, parent_contract_id, status, ' +
        'client:users!contracts_client_id_fkey(full_name), ' +
        'contact:contacts!contracts_contact_id_fkey(full_name), ' +
        'dog:dogs!contracts_dog_id_fkey(name)',
    )
    .eq('status', 'draft')
    .is('parent_contract_id', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as {
    id: string;
    contract_number: string | null;
    body_html: string | null;
    dog_id: string | null;
    client_id: string | null;
    contact_id: string | null;
    client?: { full_name: string } | null;
    contact?: { full_name: string | null } | null;
    dog?: { name: string } | null;
  }[])
    .map((r) => {
      const count = contractBlockers({
        body_html: r.body_html,
        dog_id: r.dog_id,
        client_id: r.client_id,
        contact_id: r.contact_id,
      }).length;
      return {
        id: r.id,
        label: `${r.client?.full_name ?? r.contact?.full_name ?? 'Buyer'} · ${r.dog?.name ?? 'Dog'}`,
        count,
      };
    })
    .filter((r) => r.count > 0);
}
