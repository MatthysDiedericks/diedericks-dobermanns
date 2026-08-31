import { Pressable, View } from 'react-native';

import { PlanDogChip } from '@/components/breeding/PlanDogChip';
import { PlanStatusPill } from '@/components/breeding/PlanStatusPill';
import { Typography } from '@/components/ui/Typography';
import { formatExpectedWindow } from '@/lib/breeding/planStatus';
import type { DerivedStep } from '@/lib/breeding/planTypes';
import { formatKennelDate } from '@/lib/kennel/formatters';

export function PlanStepCard({
  step,
  onPress,
  onSkip,
  onMoveUp,
  onMoveDown,
}: {
  step: DerivedStep;
  onPress?: () => void;
  onSkip?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const skipped = step.effectiveStatus === 'skipped';
  const window = formatExpectedWindow(
    step.expected_start,
    step.expected_end,
    formatKennelDate,
  );

  return (
    <Pressable
      onPress={onPress}
      className={`mb-4 rounded-2xl border p-4 ${
        step.isNext ? 'border-gold bg-gold/10' : 'border-gold/15 bg-black-rich'
      }`}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-full border border-gold/40">
            <Typography variant="caption" className="text-gold">
              {step.step_order}
            </Typography>
          </View>
          {step.isNext ? (
            <View className="rounded-full bg-gold px-2 py-0.5">
              <Typography variant="caption" className="text-black" style={{ fontSize: 10 }}>
                NEXT
              </Typography>
            </View>
          ) : null}
        </View>
        <PlanStatusPill status={step.effectiveStatus} />
      </View>

      <Typography
        variant="body"
        className={skipped ? 'text-subtle line-through' : 'text-ink'}
      >
        {step.title}
      </Typography>
      {step.detail ? (
        <Typography variant="caption" className="mt-1 text-subtle">
          {step.detail}
        </Typography>
      ) : null}

      <View className="mt-3 flex-row flex-wrap">
        {step.dam ? <PlanDogChip dog={step.dam} role="Dam" /> : null}
        {step.sire ? <PlanDogChip dog={step.sire} role="Sire" /> : null}
        {step.result_dog ? <PlanDogChip dog={step.result_dog} role="Keeper" /> : null}
      </View>

      {window ? (
        <Typography variant="caption" className="mt-2 text-gold">
          {window}
        </Typography>
      ) : null}

      {step.effectiveStatus === 'blocked' && step.blocked_reason ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {step.blocked_reason}
        </Typography>
      ) : null}

      {step.isNext ? (
        <Typography variant="caption" className="mt-2 text-gold">
          What happens next: {step.title}
        </Typography>
      ) : null}

      <View className="mt-3 flex-row flex-wrap gap-3">
        {onMoveUp ? (
          <Pressable onPress={onMoveUp}>
            <Typography variant="caption" className="text-gold">
              Move up
            </Typography>
          </Pressable>
        ) : null}
        {onMoveDown ? (
          <Pressable onPress={onMoveDown}>
            <Typography variant="caption" className="text-gold">
              Move down
            </Typography>
          </Pressable>
        ) : null}
        {onSkip && !skipped ? (
          <Pressable onPress={onSkip}>
            <Typography variant="caption" className="text-subtle">
              Skip
            </Typography>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
