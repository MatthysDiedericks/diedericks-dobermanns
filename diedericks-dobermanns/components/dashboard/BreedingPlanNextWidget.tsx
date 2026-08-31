import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PlanStatusPill } from '@/components/breeding/PlanStatusPill';
import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { useActivePlanNextSteps } from '@/hooks/useBreedingPlans';

export function BreedingPlanNextWidget() {
  const router = useRouter();
  const { rows, loading } = useActivePlanNextSteps();

  return (
    <SurfaceCard
      title="Breeding programme — next steps"
      href="/(admin)/breeding/plans"
      badge={rows.length}
      badgeTone="gold"
    >
      {loading && rows.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          Loading the programme…
        </Typography>
      ) : rows.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          No active plans yet.
        </Typography>
      ) : (
        rows.map((row) => (
          <Pressable
            key={row.plan.id}
            onPress={() => router.push(`/(admin)/breeding/plans/${row.plan.id}` as never)}
            className="border-b border-gold/10 py-3"
          >
            <Typography variant="caption" className="text-gold">
              {row.plan.name}
            </Typography>
            {row.next ? (
              <View className="mt-1 flex-row items-start gap-2">
                <View className="mt-0.5 rounded-full bg-gold px-2 py-0.5">
                  <Typography variant="caption" className="text-black" style={{ fontSize: 9 }}>
                    NEXT
                  </Typography>
                </View>
                <View className="flex-1">
                  <Typography variant="body">{row.next.title}</Typography>
                  <PlanStatusPill status={row.next.effectiveStatus} />
                </View>
              </View>
            ) : (
              <Typography variant="caption" className="text-subtle">
                Every step on this plan is done.
              </Typography>
            )}
            {row.blocked.map((s) => (
              <Typography key={s.id} variant="caption" className="mt-1 text-danger">
                Blocked: {s.blocked_reason || s.title}
              </Typography>
            ))}
          </Pressable>
        ))
      )}
    </SurfaceCard>
  );
}
