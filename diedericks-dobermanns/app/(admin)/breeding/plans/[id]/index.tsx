import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { PlanStepCard } from '@/components/breeding/PlanStepCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useBreedingPlan } from '@/hooks/useBreedingPlan';
import {
  moveBreedingPlanStep,
  skipBreedingPlanStep,
} from '@/lib/breeding/planMutations';
import { PLAN_STATUS_LABELS } from '@/lib/breeding/planTypes';
import { showError } from '@/lib/dogDetail/feedback';

export default function BreedingPlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plan, loading, error, refresh } = useBreedingPlan(id);

  async function skip(stepId: string) {
    Alert.alert(
      'Skip this step?',
      'It stays visible, struck through, so the history of the plan is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await skipBreedingPlanStep(stepId);
                await refresh();
              } catch (e) {
                showError(e instanceof Error ? e.message : 'Could not skip');
              }
            })();
          },
        },
      ],
    );
  }

  async function move(stepId: string, direction: 'up' | 'down') {
    if (!id) return;
    try {
      await moveBreedingPlanStep(id, stepId, direction);
      await refresh();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not reorder');
    }
  }

  const next = plan?.steps.find((s) => s.isNext);

  return (
    <ScreenContainer>
      <PageHeader title={plan?.name ?? 'Plan'} eyebrow="Plan tracker" />
      <View className="px-6 pb-12">
        {error ? (
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        ) : null}
        {loading && !plan ? (
          <Typography variant="caption" className="text-subtle">
            Loading…
          </Typography>
        ) : null}
        {plan ? (
          <>
            <Typography variant="caption" className="mb-1 text-subtle">
              {PLAN_STATUS_LABELS[plan.status]}
            </Typography>
            <Typography variant="body" className="mb-4">
              {plan.objective}
            </Typography>
            {next ? (
              <View className="mb-6 rounded-2xl border-2 border-gold bg-gold/10 p-4">
                <Typography variant="label" className="mb-1">
                  Next
                </Typography>
                <Typography variant="body">{next.title}</Typography>
              </View>
            ) : null}

            {plan.steps.map((step, index) => (
              <PlanStepCard
                key={step.id}
                step={step}
                onPress={() =>
                  router.push(`/(admin)/breeding/plans/${plan.id}/step?stepId=${step.id}` as never)
                }
                onSkip={() => void skip(step.id)}
                onMoveUp={index > 0 ? () => void move(step.id, 'up') : undefined}
                onMoveDown={
                  index < plan.steps.length - 1 ? () => void move(step.id, 'down') : undefined
                }
              />
            ))}

            <Button
              label="Add a step"
              className="mt-2"
              onPress={() => router.push(`/(admin)/breeding/plans/${plan.id}/step` as never)}
            />
            <Button
              label="Insert after the next step"
              variant="outline"
              className="mt-2"
              onPress={() =>
                router.push(
                  `/(admin)/breeding/plans/${plan.id}/step?after=${next?.step_order ?? ''}` as never,
                )
              }
            />
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
