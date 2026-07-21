import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { ExpiringDocumentsWidget } from '@/components/dashboard/ExpiringDocumentsWidget';
import { LittersByYearWidget } from '@/components/dashboard/LittersByYearWidget';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDashboard } from '@/hooks/useDashboard';
import { formatAmount } from '@/lib/finance/formatters';
import {
  daysInHeat,
  daysSinceOvulation,
  formatDogAge,
  formatKennelDate,
  isDueToday,
  isOverdue,
  timeAgo,
} from '@/lib/kennel/formatters';

function RowArrow() {
  return <Ionicons name="chevron-forward" size={16} color={Colors.silver} />;
}

export function AdminDashboardContent() {
  const router = useRouter();
  const { data, loading, error, refresh, completeTodo } = useDashboard();

  if (loading && !data) {
    return (
      <View className="py-12 items-center">
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="px-6 py-8">
        <Typography variant="body" className="text-danger">{error}</Typography>
        <Button label="Retry" onPress={refresh} className="mt-4" />
      </View>
    );
  }

  if (!data) return null;

  return (
    <ScrollView
      className="px-6 pb-12"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />}
    >
      {/* Widget — Expiring Documents */}
      <ExpiringDocumentsWidget />

      {/* Widget 1 — Current Litters */}
      <LittersByYearWidget currentLitters={data.currentLitters} />

      {/* Widget — Breeding Programme */}
      <SurfaceCard title="Breeding Programme" href="/(admin)/breeding/index">
        <Typography variant="caption" className="text-subtle">
          Line A &amp; Line B succession, pairing rules, and generation organogram.
        </Typography>
        <Button
          label="Open Programme"
          variant="outline"
          size="sm"
          onPress={() => router.push('/(admin)/breeding/index' as never)}
          className="mt-3"
        />
      </SurfaceCard>

      {/* Widget 2 — Upcoming Heats */}
      <SurfaceCard title="Upcoming Heats" href="/(admin)/heats/index">
        {data.upcomingHeats.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            No upcoming heats recorded. Track your dams&apos; heat cycles to plan ahead.
          </Typography>
        ) : (
          data.upcomingHeats.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => router.push('/(admin)/heats/index' as never)}
              className="flex-row items-center border-b border-gold/10 py-3"
            >
              <View className="flex-1">
                <Typography variant="body">{formatKennelDate(h.expected_whelp_date)}</Typography>
                <Pressable onPress={() => router.push(`/(admin)/dogs/${h.dog_id}/edit` as never)}>
                  <Typography variant="label" className="text-gold">{h.dog_name ?? '—'}</Typography>
                </Pressable>
                <Typography variant="caption">
                  {formatDogAge(h.date_of_birth)} · # Litters: {h.litter_count ?? 0}
                </Typography>
              </View>
              <Typography variant="caption" className="mr-2">
                {h.status === 'in_heat' ? '🔴' : h.status === 'mated' ? '🟡' : '🟢'}
              </Typography>
              <RowArrow />
            </Pressable>
          ))
        )}
      </SurfaceCard>

      {/* Widget 3 — Expected Litters */}
      <SurfaceCard title="Expected Litters">
        {data.expectedLitters.length === 0 ? (
          <Typography variant="caption" className="text-subtle">No mated dams awaiting whelp.</Typography>
        ) : (
          data.expectedLitters.map((h) => (
            <View key={h.id} className="flex-row items-center border-b border-gold/10 py-3">
              <View className="flex-1">
                <Typography variant="body">{h.dam_name ?? h.dog_name ?? '—'}</Typography>
                <Typography variant="caption">
                  Days since ovulation: {daysSinceOvulation(h.ovulation_date) ?? '—'}
                </Typography>
                <Typography variant="caption">Due {formatKennelDate(h.expected_whelp_date)}</Typography>
              </View>
              <Typography variant="caption" className="text-gold">
                {h.status === 'confirmed_pregnant' ? 'Confirmed' : 'Mated'}
              </Typography>
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Widget 4 — In Heat */}
      <SurfaceCard title="In Heat, Not Mated">
        {data.inHeat.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            There are no females currently in heat.
          </Typography>
        ) : (
          data.inHeat.map((h) => (
            <View key={h.id} className="flex-row items-center justify-between border-b border-gold/10 py-3">
              <View>
                <Typography variant="body">{h.dog_name}</Typography>
                <Typography variant="caption">
                  {formatKennelDate(h.heat_start_date)} · {daysInHeat(h.heat_start_date)}d in heat
                </Typography>
              </View>
              <Button
                label="Record mating"
                size="sm"
                variant="secondary"
                onPress={() => router.push('/(admin)/heats/index' as never)}
              />
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Widget 5 — Enquiries */}
      <SurfaceCard
        title="Customer Enquiries"
        href="/(admin)/enquiries"
        badge={data.enquiries.length}
        badgeTone="gold"
      >
        {data.enquiries.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            There are no recent customer enquiries.
          </Typography>
        ) : (
          data.enquiries.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => router.push('/(admin)/enquiries')}
              className="border-b border-gold/10 py-3"
            >
              <Typography variant="body">{e.full_name}</Typography>
              <Typography variant="caption">{e.subject ?? 'Enquiry'} · {timeAgo(e.created_at)}</Typography>
            </Pressable>
          ))
        )}
      </SurfaceCard>

      {/* Widget 6 — To-Do */}
      <SurfaceCard
        title="To-Do Items"
        href="/(admin)/todos/index"
        badge={data.overdueTodos}
        badgeTone="danger"
      >
        {data.todos.length === 0 ? (
          <View className="items-center py-4">
            <Ionicons name="checkmark-circle" size={32} color={Colors.gold} />
            <Typography variant="body" className="mt-2">All tasks complete. Well done.</Typography>
          </View>
        ) : (
          data.todos.map((t) => (
            <View key={t.id} className="flex-row items-center border-b border-gold/10 py-3">
              <Pressable onPress={() => completeTodo(t.id)} className="mr-3 h-6 w-6 items-center justify-center border border-gold/40 rounded">
                <Typography variant="caption">✓</Typography>
              </Pressable>
              <View className="flex-1">
                <Typography
                  variant="body"
                  className={isOverdue(t.due_date) ? 'text-danger' : isDueToday(t.due_date) ? 'text-gold' : ''}
                >
                  {formatKennelDate(t.due_date)}
                </Typography>
                <Typography variant="subtitle">{t.title}</Typography>
                {t.litter_label ? (
                  <Pressable onPress={() => t.litter_id && router.push(`/(admin)/litters/${t.litter_id}` as never)}>
                    <Typography variant="caption">{t.litter_label}</Typography>
                  </Pressable>
                ) : t.dog_name ? (
                  <Pressable onPress={() => t.dog_id && router.push(`/(admin)/dogs/${t.dog_id}/edit` as never)}>
                    <Typography variant="caption">🐕 {t.dog_name}</Typography>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Widget 7 — Waiting List */}
      <SurfaceCard title="Waiting List" href="/(admin)/waiting-list">
        <View className="flex-row justify-between gap-2">
          <Pressable
            onPress={() => router.push('/(admin)/waiting-list')}
            className="flex-1 items-center rounded-sm border border-gold/30 p-3"
          >
            <Typography variant="display" className="text-gold">{data.waitlist.active}</Typography>
            <Typography variant="caption">Active</Typography>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(admin)/waiting-list')}
            className="flex-1 items-center rounded-sm border border-gold/30 p-3"
          >
            <Typography variant="display" className="text-amber-400">{data.waitlist.awaitingDeposit}</Typography>
            <Typography variant="caption">Awaiting deposit</Typography>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(admin)/waiting-list')}
            className="flex-1 items-center rounded-sm border border-gold/30 p-3"
          >
            <Typography variant="display" className="text-danger">{data.waitlist.followUpsOverdue}</Typography>
            <Typography variant="caption">Follow-ups overdue</Typography>
          </Pressable>
        </View>
      </SurfaceCard>

      {/* Widget 8 — Finance */}
      <SurfaceCard title="Finance" href="/(admin)/finance/index">
        <View className="flex-row justify-between">
          <View>
            <Typography variant="caption">Income this month</Typography>
            <Typography variant="display" className="text-gold">{formatAmount(data.finance.income)}</Typography>
          </View>
          <View>
            <Typography variant="caption">Expenses</Typography>
            <Typography variant="display" className="text-danger">{formatAmount(data.finance.expenses)}</Typography>
          </View>
          <View>
            <Typography variant="caption">Net</Typography>
            <Typography
              variant="display"
              className={data.finance.net >= 0 ? 'text-gold' : 'text-danger'}
            >
              {formatAmount(data.finance.net)}
            </Typography>
          </View>
        </View>
      </SurfaceCard>
    </ScrollView>
  );
}
