import { AdminHeader } from '@/components/admin/AdminHeader';
import { cardClass } from '@/lib/admin/styles';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('kennel_documents')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <>
      <AdminHeader title="Documents" subtitle="Kennel file library — breed docs, templates, certificates." />
      <div className="space-y-2">
        {(data ?? []).map((d) => (
          <div key={d.id} className={cardClass}>
            <p className="font-medium">
              {d.is_starred ? '⭐ ' : ''}{d.name}
            </p>
            <p className="text-sm text-subtle">
              {d.category} · {d.original_filename} · {formatDate(d.created_at)}
            </p>
            <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:underline">
              Open
            </a>
          </div>
        ))}
        {(data ?? []).length === 0 ? (
          <p className="text-subtle text-sm">No documents uploaded yet.</p>
        ) : null}
      </div>
    </>
  );
}
