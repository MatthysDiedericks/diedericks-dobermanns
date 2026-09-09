import { TextInput, View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Typography } from '@/components/ui/Typography';
import type { TemperamentArea } from '@/lib/protection/types';

export function TemperamentBlock({
  areas,
  trainingExclusions,
  scenarioExclusions,
  onArea,
  onTrainingExclusions,
  onScenarioExclusions,
}: {
  areas: TemperamentArea[];
  trainingExclusions: string;
  scenarioExclusions: string;
  onArea: (index: number, body: string) => void;
  onTrainingExclusions: (value: string) => void;
  onScenarioExclusions: (value: string) => void;
}) {
  return (
    <SectionCard title="Temperament">
      {areas.map((area, i) => (
        <View key={area.area} className="mb-3">
          <Typography variant="caption">{area.area}</Typography>
          <TextInput
            multiline
            className="mt-1 min-h-[72px] rounded-sm border border-gold/25 px-3 py-2 text-text"
            value={area.body}
            onChangeText={(body) => onArea(i, body)}
          />
        </View>
      ))}
      <Typography variant="caption">What the sale does not include</Typography>
      <TextInput
        multiline
        className="mt-1 min-h-[64px] rounded-sm border border-gold/25 px-3 py-2 text-text"
        value={trainingExclusions}
        onChangeText={onTrainingExclusions}
      />
      <Typography variant="caption" className="mt-3">
        What he has not been worked in
      </Typography>
      <TextInput
        multiline
        className="mt-1 min-h-[64px] rounded-sm border border-gold/25 px-3 py-2 text-text"
        value={scenarioExclusions}
        onChangeText={onScenarioExclusions}
      />
    </SectionCard>
  );
}
