import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  BREADCRUMB_STAGES,
  nextStepCopy,
} from '@/lib/waitlist/pipeline';
import { stageLabel } from '@/lib/waitlist/constants';

type Props = {
  currentStage: string | null | undefined;
  /** Optional map of stage → ISO date when reached. */
  reachedAt?: Partial<Record<string, string | null>>;
};

export function PipelineBreadcrumb({ currentStage, reachedAt }: Props) {
  const current = currentStage ?? 'enquiry';
  const currentIdx = BREADCRUMB_STAGES.indexOf(
    current as (typeof BREADCRUMB_STAGES)[number],
  );

  return (
    <View className="rounded-xl border border-gold/20 bg-surface p-4">
      <Typography variant="label" className="mb-3 text-gold">
        YOUR PIPELINE
      </Typography>
      {BREADCRUMB_STAGES.map((stage, index) => {
        const done = currentIdx > index;
        const active = currentIdx === index || (currentIdx < 0 && index === 0 && current === stage);
        const isCurrent = current === stage;
        const date = reachedAt?.[stage];
        return (
          <View key={stage} className="mb-3 flex-row items-start last:mb-0">
            <View
              className={`mr-3 h-7 w-7 items-center justify-center rounded-full border ${
                done || isCurrent ? 'border-gold bg-gold' : 'border-border bg-background'
              }`}
            >
              <Typography
                variant="caption"
                className={done || isCurrent ? 'text-black' : 'text-subtle'}
              >
                {done ? '✓' : String(index + 1)}
              </Typography>
            </View>
            <View className="flex-1">
              <Typography
                variant="caption"
                className={
                  isCurrent ? 'font-semibold text-gold' : done || active ? 'text-ink' : 'text-subtle'
                }
              >
                {stageLabel(stage)}
              </Typography>
              {date ? (
                <Typography variant="caption" className="text-subtle">
                  {date.slice(0, 10)}
                </Typography>
              ) : null}
            </View>
          </View>
        );
      })}
      <Typography variant="caption" className="mt-2 text-silver">
        Next: {nextStepCopy(current)}
      </Typography>
    </View>
  );
}
