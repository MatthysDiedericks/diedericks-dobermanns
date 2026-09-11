import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { Achievement } from '@/types/app.types';

/**
 * This dog's own trial results from the `achievements` table.
 * Never mix with `pedigree_ancestors.titles_health`.
 */
export function DogAchievementsBlock({
  achievements,
}: {
  achievements: Achievement[];
}) {
  if (achievements.length === 0) return null;

  return (
    <View className="mt-4 border-t border-gold/20 pt-4">
      <Typography variant="title" className="text-gold">
        Achievements
      </Typography>
      <View className="mt-3 gap-3">
        {achievements.map((a) => (
          <View key={a.id} className="rounded-xl border border-gold/20 bg-surface p-4">
            <View className="flex-row items-center justify-between gap-3">
              <Typography variant="subtitle" className="flex-1">
                {a.title}
              </Typography>
              {a.score ? (
                <Typography variant="caption" className="text-gold">
                  {a.score}
                </Typography>
              ) : null}
            </View>
            <Typography variant="caption" className="mt-1 text-muted">
              {[a.trial_date ? formatKennelDate(a.trial_date) : null, a.location, a.judge]
                .filter(Boolean)
                .join(' · ')}
            </Typography>
          </View>
        ))}
      </View>
    </View>
  );
}
