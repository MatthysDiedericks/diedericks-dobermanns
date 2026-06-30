import { AdminHeader } from '@/components/admin/AdminHeader';
import { cardClass } from '@/lib/admin/styles';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const supabase = await createClient();
  const [templates, contracts] = await Promise.all([
    supabase.from('contract_templates').select('*').order('name'),
    supabase
      .from('contracts')
      .select('id, contract_title, status, created_at, signed_by_client, client:users(full_name), dog:dogs(name)')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <>
      <AdminHeader title="Contracts" subtitle="Templates and individual contracts with eSign." />
      <h2 className="mb-3 font-cinzel text-sm uppercase tracking-widest text-gold">Templates</h2>
      <div className="mb-8 space-y-2">
        {(templates.data ?? []).map((t) => (
          <div key={t.id} className={cardClass}>
            <p className="font-medium">{t.name}</p>
            <p className="text-sm text-subtle">{t.contract_title}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-3 font-cinzel text-sm uppercase tracking-widest text-gold">Contracts</h2>
      <div className="space-y-2">
        {(contracts.data ?? []).map((c) => {
          const row = c as {
            id: string;
            contract_title: string | null;
            status: string | null;
            created_at: string;
            signed_by_client: boolean;
            client?: { full_name: string } | null;
            dog?: { name: string } | null;
          };
          return (
            <div key={row.id} className={cardClass}>
              <p className="font-medium">{row.contract_title ?? 'Contract'}</p>
              <p className="text-sm text-subtle">
                {row.client?.full_name} · {row.dog?.name} · {formatDate(row.created_at)} · {row.status}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
