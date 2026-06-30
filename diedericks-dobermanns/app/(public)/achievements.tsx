import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAchievements } from '@/hooks/useRecords';

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View className="mt-1 flex-row">
      <Typography variant="caption" className="w-20">
        {label}
      </Typography>
      <Typography variant="bodyMuted" className="flex-1">
        {value}
      </Typography>
    </View>
  );
}

export default function AchievementsScreen() {
  const { data: achievements, loading } = useAchievements();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Our Record" title="Achievements" />
      <View className="gap-3 px-6">
        {!loading && achievements.length === 0 ? (
          <EmptyState
            title="Titles coming soon"
            message="Our dogs are actively competing — results will appear here."
          />
        ) : (
          achievements.map((a) => (
            <Card key={a.id}>
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-gold/15">
                  <Ionicons name="trophy" size={18} color={Colors.gold} />
                </View>
                <Typography variant="subtitle" className="ml-3 flex-1">
                  {a.title}
                </Typography>
              </View>
              <View className="mt-3">
                <Row label="Date" value={a.trial_date} />
                <Row label="Venue" value={a.location} />
                <Row label="Judge" value={a.judge} />
                <Row label="Score" value={a.score} />
                <Row label="Notes" value={a.notes} />
              </View>
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
