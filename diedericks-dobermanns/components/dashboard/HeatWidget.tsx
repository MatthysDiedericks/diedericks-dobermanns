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
          <Typography variant="caption" className="text-subtle">No upcoming heats on record.</Typography>
        ) : (
          upcoming.slice(0, 5).map((h) => {
            const date = h.next_heat_date ?? h.expected_whelp_date;
            const days = date ? differenceInDays(parseISO(date), new Date()) : null;
            return (
              <Pressable
                key={h.id}
                onPress={() => router.push(`/(tabs)/dogs/${h.dog_id}` as never)}
                className="flex-row items-center border-b border-gold/10 py-3"
              >
                <View className="flex-1">
                  <Typography variant="body">{h.dog_name ?? 'Dog'}</Typography>
                  <Typography variant="caption">{formatKennelDate(date)}</Typography>
                  {days != null ? (
                    <Typography variant="caption" className="text-gold">{days} days away</Typography>
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
          <Typography variant="caption" className="text-subtle">No dams currently in heat without mating.</Typography>
        ) : (
          inHeat.map((h) => {
            const days = h.heat_start_date
              ? differenceInDays(new Date(), parseISO(h.heat_start_date))
              : 0;
            return (
              <Pressable
                key={h.id}
                onPress={() => router.push(`/(tabs)/dogs/${h.dog_id}` as never)}
                className="flex-row items-center border-b border-gold/10 py-3"
              >
                <View className="flex-1">
                  <Typography variant="body">{h.dog_name ?? 'Dog'}</Typography>
                  <Typography variant="caption" className="text-danger">
                    {days} days in heat
                  </Typography>
                </View>
                <Badge label="Urgent" tone="danger" />
              </Pressable>
            );
          })
        )}
      </SurfaceCard>
    </>
  );
}
