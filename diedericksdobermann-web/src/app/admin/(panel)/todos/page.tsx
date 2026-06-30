import { AdminHeader } from '@/components/admin/AdminHeader';
import { cardClass } from '@/lib/admin/styles';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TodosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('todo_items')
    .select('*')
    .eq('is_completed', false)
    .order('due_date', { ascending: true });

  return (
    <>
      <AdminHeader title="To-Do Items" subtitle="Kennel tasks and auto-generated litter schedules." />
      <div className="space-y-3">
        {(data ?? []).map((t) => (
          <div key={t.id} className={cardClass}>
            <p className="font-medium">{t.title}</p>
            <p className="text-sm text-subtle">
              {formatDate(t.due_date)} · {t.category} · {t.priority}
            </p>
          </div>
        ))}
        {(data ?? []).length === 0 ? (
          <p className="text-subtle text-sm">All tasks complete. Well done.</p>
        ) : null}
      </div>
    </>
  );
}
