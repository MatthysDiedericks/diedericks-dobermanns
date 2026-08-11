import { useRouter } from 'expo-router';
import { differenceInDays, parseISO } from 'date-fns';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { HeatCycleWithDog } from '@/types/kennel';
import { formatKennelDate } from '@/lib/kennel/formatters';

function urgencyTone(days: number): 'normal' | 'amber' | 'red' {
  if (days > 28) return 'red';
  if (days > 21) return 'amber';
  return 'normal';
}

export function HeatWidgets({
  upcoming,
  inHeat,
}: {
  upcoming: HeatCycleWithDog[];
  inHeat: HeatCycleWithDog[];
}) {
  const router = useRouter();

  return (
    <>
      <SurfaceCard title="Upcoming Heats" badge={upcoming.length}>
        {upcoming.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            No upcoming heats on record.
          </Typography>
        ) : (
          upcoming.slice(0, 5).map((h) => {
            const date = h.next_heat_date ?? h.expected_whelp_date;
            const days = date ? differenceInDays(parseISO(date), new Date()) : null;
            return (
              <Pressable
                key={h.id}
                onPress={() => router.push(`/(admin)/heats/${h.dog_id}` as never)}
                className="flex-row items-center border-b border-gold/10 py-3"
              >
                <View className="flex-1">
                  <Typography variant="body">{h.dog_name ?? 'Dog'}</Typography>
                  <Typography variant="caption">{formatKennelDate(date)}</Typography>
                  {days != null ? (
                    <Typography variant="caption" className="text-gold">
                      {days} days away
                    </Typography>
                  ) : null}
                </View>
                <Badge label={h.status} tone="gold" />
                <Ionicons name="chevron-forward" size={16} color={Colors.silver} />
              </Pressable>
            );
          })
        )}
      </SurfaceCard>

      <SurfaceCard title="In Heat — Not Mated" badge={inHeat.length} badgeTone="danger">
        {inHeat.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            No dams currently in heat without mating.
          </Typography>
        ) : (
          inHeat.map((h) => {
            const days = h.heat_start_date
              ? differenceInDays(new Date(), parseISO(h.heat_start_date))
              : 0;
            const urgency = urgencyTone(days);
            const dayColor =
              urgency === 'red'
                ? 'text-danger'
                : urgency === 'amber'
                  ? 'text-amber-400'
                  : 'text-gold';
            return (
              <Pressable
                key={h.id}
                onPress={() => router.push(`/(admin)/heats/${h.dog_id}` as never)}
                className="flex-row items-center border-b border-gold/10 py-3"
              >
                <View className="flex-1">
                  <Typography variant="body">{h.dog_name ?? 'Dog'}</Typography>
                  <Typography variant="caption" className={dayColor}>
                    {days} days in heat
                    {h.planned_sire_name ? ` · planned sire ${h.planned_sire_name}` : ''}
                    {h.expected_whelp_date
                      ? ` · expected litter ${formatKennelDate(h.expected_whelp_date)}`
                      : ''}
                  </Typography>
                  {(h.age_label || h.litter_count != null) && (
                    <Typography variant="caption" className="text-subtle">
                      {h.age_label ? `Age ${h.age_label}` : 'Age unknown'}
                      {h.litter_count != null
                        ? ` · ${h.litter_count} litter${h.litter_count === 1 ? '' : 's'}`
                        : ''}
                    </Typography>
                  )}
                </View>
                <Badge
                  label={urgency === 'red' ? 'Urgent' : urgency === 'amber' ? 'Watch' : 'In heat'}
                  tone={urgency === 'normal' ? 'gold' : 'danger'}
                />
              </Pressable>
            );
          })
        )}
      </SurfaceCard>
    </>
  );
}
