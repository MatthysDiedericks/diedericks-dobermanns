import Link from 'next/link';

import { formatAmount } from '@/lib/finance/formatters';
import { formatDate } from '@/lib/utils';
import type {
  CurrentLitterRow,
  TodoItemWithLinks,
} from '@/types/kennel';

type DashboardData = Awaited<ReturnType<typeof import('@/lib/admin/kennel-queries').fetchDashboardData>>;

function SurfaceCard({
  title,
  href,
  badge,
  badgeClass,
  children,
}: {
  title: string;
  href?: string;
  badge?: number;
  badgeClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-gold/20 bg-surface">
      <div className="flex items-center justify-between border-t-2 border-gold px-4 py-3">
        {href ? (
          <Link href={href} className="font-cinzel text-xs uppercase tracking-widest text-gold hover:text-gold-light">
            {title} →
          </Link>
        ) : (
          <h2 className="font-cinzel text-xs uppercase tracking-widest text-gold">{title}</h2>
        )}
        {badge != null && badge > 0 ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${badgeClass ?? 'bg-gold/20 text-gold'}`}>
            {badge}
          </span>
        ) : null}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

function puppyAge(birth: string | null) {
  if (!birth) return '—';
  const days = Math.floor((Date.now() - new Date(birth).getTime()) / 86_400_000);
  const w = Math.floor(days / 7);
  const d = days % 7;
  return w > 0 ? `${w}w ${d}d` : `${days}d`;
}

export function DashboardWidgets({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <SurfaceCard title="Current Litters" href="/admin/litters">
          {data.currentLitters.length === 0 ? (
            <p className="text-sm text-subtle">No active litters at the moment.</p>
          ) : (
            <ul className="divide-y divide-gold/10">
              {(data.currentLitters as CurrentLitterRow[]).map((l) => (
                <li key={l.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p>{formatDate(l.actual_date)}</p>
                    <p className="text-gold text-xs">
                      {l.go_home_weeks ?? 10} wks: {formatDate(l.go_home_date)}
                    </p>
                    <p className="text-subtle">{puppyAge(l.actual_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>♂{l.male_count ?? 0} ♀{l.female_count ?? 0}</span>
                    <Link href={`/admin/litters/${l.id}`} className="text-gold">→</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard title="Upcoming Heats" href="/admin/heats">
          {data.upcomingHeats.length === 0 ? (
            <p className="text-sm text-subtle">No upcoming heats recorded.</p>
          ) : (
            <ul className="divide-y divide-gold/10 text-sm">
              {data.upcomingHeats.map((h) => {
                const row = h as { id: string; expected_whelp_date: string; status: string; dog_id: string };
                return (
                  <li key={row.id} className="flex justify-between py-2">
                    <span>{formatDate(row.expected_whelp_date)}</span>
                    <span className="text-gold">{row.dog_id.slice(0, 8)}</span>
                    <span>{row.status === 'in_heat' ? '🔴' : row.status === 'mated' ? '🟡' : '🟢'}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard title="To-Do Items" href="/admin/todos" badge={data.overdueTodos} badgeClass="bg-danger/20 text-red-400">
          {data.todos.length === 0 ? (
            <p className="text-sm text-subtle">All tasks complete. Well done.</p>
          ) : (
            <ul className="divide-y divide-gold/10 text-sm">
              {(data.todos as TodoItemWithLinks[]).map((t) => (
                <li key={t.id} className="py-2">
                  <span className="text-subtle">{formatDate(t.due_date)}</span>
                  <p className="font-medium">{t.title}</p>
                  {t.litter_label ? <p className="text-xs text-subtle">{t.litter_label}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      </div>

      <div className="space-y-6">
        <SurfaceCard title="Expected Litters">
          {data.expectedLitters.length === 0 ? (
            <p className="text-sm text-subtle">No mated dams awaiting whelp.</p>
          ) : (
            <ul className="text-sm divide-y divide-gold/10">
              {data.expectedLitters.map((h) => {
                const row = h as { id: string; dog_id: string; expected_whelp_date: string; status: string };
                return (
                  <li key={row.id} className="py-2">
                    <p>{row.dog_id.slice(0, 8)}…</p>
                    <p className="text-subtle">Due {formatDate(row.expected_whelp_date)} · {row.status}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard title="In Heat, Not Mated">
          {data.inHeat.length === 0 ? (
            <p className="text-sm text-subtle">There are no females currently in heat.</p>
          ) : (
            <ul className="text-sm">
              {data.inHeat.map((h) => {
                const row = h as { id: string; dog_id: string; heat_start_date: string };
                return (
                  <li key={row.id} className="py-1">
                    {row.dog_id.slice(0, 8)}… · {formatDate(row.heat_start_date)}
                  </li>
                );
              })}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard title="Customer Enquiries" href="/admin/enquiries" badge={data.enquiries.length}>
          {data.enquiries.length === 0 ? (
            <p className="text-sm text-subtle">There are no recent customer enquiries.</p>
          ) : (
            <ul className="text-sm divide-y divide-gold/10">
              {data.enquiries.map((e) => (
                <li key={e.id} className="py-2">
                  <p>{e.full_name}</p>
                  <p className="text-subtle text-xs">{e.subject}</p>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard title="Waiting List" href="/admin/litters">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-sm border border-gold/20 p-2">
              <p className="font-cinzel text-lg text-gold">{data.waitlist.active}</p>
              <p className="text-xs text-subtle">Active</p>
            </div>
            <div className="rounded-sm border border-gold/20 p-2">
              <p className="font-cinzel text-lg text-amber-400">{data.waitlist.awaitingDeposit}</p>
              <p className="text-xs text-subtle">Awaiting deposit</p>
            </div>
            <div className="rounded-sm border border-gold/20 p-2">
              <p className="font-cinzel text-lg text-red-400">{data.waitlist.followUpsOverdue}</p>
              <p className="text-xs text-subtle">Overdue</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard title="Finance" href="/admin/finance">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-subtle">Income</p>
              <p className="font-cinzel text-gold">{formatAmount(data.finance.income)}</p>
            </div>
            <div>
              <p className="text-subtle">Expenses</p>
              <p className="font-cinzel text-red-400">{formatAmount(data.finance.expenses)}</p>
            </div>
            <div>
              <p className="text-subtle">Net</p>
              <p className={`font-cinzel ${data.finance.net >= 0 ? 'text-gold' : 'text-red-400'}`}>
                {formatAmount(data.finance.net)}
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
