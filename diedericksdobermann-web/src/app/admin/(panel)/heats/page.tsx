import { AdminHeader } from '@/components/admin/AdminHeader';
import { cardClass } from '@/lib/admin/styles';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HeatsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('heat_cycles')
    .select('*')
    .order('expected_whelp_date', { ascending: true });

  return (
    <>
      <AdminHeader title="Heat Cycles" subtitle="Track heats, matings, and expected whelps." />
      <div className="space-y-3">
        {(data ?? []).map((h) => {
          const row = h as { id: string; status: string; heat_start_date: string; expected_whelp_date: string | null; dog_id: string };
          return (
            <div key={row.id} className={cardClass}>
              <p className="font-cinzel text-gold">Dam ID: {row.dog_id.slice(0, 8)}…</p>
              <p className="text-sm text-subtle">
                {row.status.replace(/_/g, ' ')} · Heat {formatDate(row.heat_start_date)} · Due {formatDate(row.expected_whelp_date)}
              </p>
            </div>
          );
        })}
        {(data ?? []).length === 0 ? (
          <p className="text-subtle text-sm">No heat cycles recorded yet.</p>
        ) : null}
      </div>
    </>
  );
}
