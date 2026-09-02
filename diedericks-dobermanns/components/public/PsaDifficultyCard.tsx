import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import {
  PSA_LEAD_BODY,
  PSA_LEAD_HEADLINE,
  PSA_RANKED_SPORTS,
  PSA_RANKING_CAVEAT,
  PSA_RANKING_FRAMING,
  PSA_RECORD,
  PSA_WHY,
} from '@/lib/content/psaDifficulty';

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <Typography variant="bodyMuted">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} className="font-body-semibold text-ink">
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <Text key={i} className="italic">
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Typography>
  );
}

/** Frames why a PSA placing matters, before the titles list. */
export function PsaDifficultyCard() {
  return (
    <Card className="p-5">
      <Typography variant="title">{PSA_LEAD_HEADLINE}</Typography>
      <Typography variant="bodyMuted" className="mt-4">
        {PSA_LEAD_BODY}
      </Typography>
      <View className="mt-4">
        <RichText text={PSA_WHY} />
      </View>

      <Typography variant="subtitle" className="mt-8">
        {PSA_RANKING_FRAMING}
      </Typography>
      <View className="mt-5">
        {PSA_RANKED_SPORTS.map((sport, index) => (
          <View key={sport.name} className="flex-row items-baseline py-2.5">
            <Typography variant="subtitle" className="w-7 text-gold">
              {index + 1}
            </Typography>
            <Typography variant="subtitle" className="min-w-0 flex-1">
              {sport.name}
              {sport.detail ? (
                <Text className="font-body text-base leading-6 text-ink-muted">
                  {" — "}
                  {sport.detail}
                </Text>
              ) : null}
            </Typography>
          </View>
        ))}
      </View>
      <Typography variant="bodyMuted" className="mt-6">
        {PSA_RANKING_CAVEAT}
      </Typography>
      <View className="mt-6">
        <RichText text={PSA_RECORD} />
      </View>
    </Card>
  );
}
