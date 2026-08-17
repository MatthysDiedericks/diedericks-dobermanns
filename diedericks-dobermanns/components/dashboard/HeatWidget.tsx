import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useFemaleHeatSummaries } from '@/hooks/useHeatCycles';
import type { FemaleHeatSummary } from '@/lib/heats/constants';

function daysLabel(f: FemaleHeatSummary): string {
  if (f.daysRemaining == null) return '';
  if (f.activeHeat) return `${f.daysRemaining} days in heat`;
  if (f.isOverdue) return `${Math.abs(f.daysRemaining)} days overdue`;
  return `${f.daysRemaining} days`;
}

export function HeatWidgets() {
  const router = useRouter();
  const { summaries, loading } = useFemaleHeatSummaries();

  return (
    <SurfaceCard title="Breeding females" href="/(admin)/heats" badge={summaries.length}>
      {loading && summaries.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          Loading females…
        </Typography>
      ) : summaries.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          No breeding females on record.
        </Typography>
      ) : (
        summaries.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => router.push(`/(admin)/heats/${f.id}` as never)}
            className="flex-row items-center border-b border-gold/10 py-3"
          >
            <View className="flex-1">
              <Typography variant="body">{f.name}</Typography>
              <Typography
                variant="caption"
                className={f.isOverdue ? 'text-amber-400' : 'text-subtle'}
              >
                {f.statusDetail}
              </Typography>
              {f.forecastBasis && !f.pregnantCycle && !f.activeHeat ? (
                <Typography variant="caption" className="text-muted">
                  {f.forecastBasis}
                </Typography>
              ) : null}
            </View>
            <Typography variant="caption" className="mr-2 text-gold">
              {daysLabel(f)}
            </Typography>
            <Ionicons name="chevron-forward" size={16} color={Colors.silver} />
          </Pressable>
        ))
      )}
    </SurfaceCard>
  );
}
