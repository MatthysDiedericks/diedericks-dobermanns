import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { stageAge, stageAgeHeadline, stageAgeNote, stageAgeSecondary } from '@/lib/waitlist/placementClose';

export function StageAgeLine({
  entry,
}: {
  entry: {
    pipeline_stage?: string | null;
    stage_updated_at?: string | null;
    date_added?: string | null;
    created_at?: string | null;
  };
}) {
  const age = stageAge(entry);
  const headline = stageAgeHeadline(entry.pipeline_stage, age);
  const note = stageAgeNote(age);
  const secondary = stageAgeSecondary(age);
  const tone = age.days >= 60 ? 'text-danger' : age.days >= 30 ? 'text-warning' : 'text-gold';

  return (
    <View className="mt-2">
      <Typography variant="subtitle" className={tone}>
        {headline}
      </Typography>
      <Typography variant="caption" className="text-silver">
        {age.importFallback ? note : 'Since this stage last changed'}
      </Typography>
      {secondary ? (
        <Typography variant="caption" className="text-silver">
          {secondary}
        </Typography>
      ) : null}
    </View>
  );
}
