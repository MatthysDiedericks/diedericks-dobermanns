import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PlanStatusPill } from '@/components/breeding/PlanStatusPill';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useBreedingPlans } from '@/hooks/useBreedingPlans';
import { plansNeedingAttention } from '@/lib/breeding/planStatus';
import { PLAN_STATUS_LABELS } from '@/lib/breeding/planTypes';

export default function BreedingPlansScreen() {
  const router = useRouter();
  const { plans, loading, error, refresh } = useBreedingPlans();
  const attention = plansNeedingAttention(plans);

  return (
    <ScreenContainer>
      <PageHeader title="Plan tracker" eyebrow="Breeding" />

      <View className="px-6 pb-12">
        <Button
          label="New plan"
          variant="solid"
          size="sm"
          onPress={() => router.push('/(admin)/breeding/plans/new' as never)}
          className="mb-6"
        />

        {error ? (
          <Typography variant="body" className="mb-4 text-danger">
            {error}
          </Typography>
        ) : null}

        {attention.length > 0 ? (
          <View className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 p-4">
            <Typography variant="label" className="mb-2">
              What needs attention
            </Typography>
            {attention.map((plan) => {
              const next = plan.steps.find((s) => s.isNext);
              const blocked = plan.steps.filter((s) => s.effectiveStatus === 'blocked');
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => router.push(`/(admin)/breeding/plans/${plan.id}` as never)}
                  className="mb-3"
                >
                  <Typography variant="body" className="text-gold">
                    {plan.name}
                  </Typography>
                  {next ? (
                    <Typography variant="caption" className="text-ink">
                      Next: {next.title}
                    </Typography>
                  ) : null}
                  {blocked.map((s) => (
                    <Typography key={s.id} variant="caption" className="text-danger">
                      {s.blocked_reason || s.title}
                    </Typography>
                  ))}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {loading && plans.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            Loading plans…
          </Typography>
        ) : plans.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            No plans yet. Write the succession in plain English so anyone can follow it.
          </Typography>
        ) : (
          plans.map((plan) => {
            const next = plan.steps.find((s) => s.isNext);
            return (
              <Pressable
                key={plan.id}
                onPress={() => router.push(`/(admin)/breeding/plans/${plan.id}` as never)}
              >
                <Card className="mb-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Typography variant="subtitle">{plan.name}</Typography>
                    <Typography variant="caption" className="text-subtle">
                      {PLAN_STATUS_LABELS[plan.status]}
                    </Typography>
                  </View>
                  <Typography variant="caption" className="mb-2 text-subtle">
                    {plan.objective}
                  </Typography>
                  {next ? (
                    <View className="flex-row items-center gap-2">
                      <PlanStatusPill status={next.effectiveStatus} />
                      <Typography variant="caption" className="flex-1 text-gold">
                        Next: {next.title}
                      </Typography>
                    </View>
                  ) : (
                    <Typography variant="caption" className="text-subtle">
                      No open steps
                    </Typography>
                  )}
                </Card>
              </Pressable>
            );
          })
        )}

        <Button label="Refresh" variant="ghost" onPress={() => void refresh()} className="mt-2" />
      </View>
    </ScreenContainer>
  );
}
