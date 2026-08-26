import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useDogHealthSchedule } from '@/hooks/useDogHealthSchedule';
import { dueWording } from '@/lib/dogs/healthCalendar';

/** Dashboard count and list share `upcoming` from useDogHealthSchedule. */
export function PortalHealthDueCard() {
  const { upcoming, loading } = useDogHealthSchedule();
  if (loading) return null;

  return (
    <Link href={'/(portal)/health-schedule' as never} asChild>
      <Pressable>
        <Card className="mb-3">
          <View className="flex-row items-center justify-between">
            <Typography variant="label" className="text-gold">
              HEALTH DUE
            </Typography>
            <Typography variant="subtitle">{upcoming.length}</Typography>
          </View>
          {upcoming.length === 0 ? (
            <Typography variant="caption" className="mt-2 text-subtle">
              Nothing due right now.
            </Typography>
          ) : (
            upcoming.slice(0, 5).map((entry) => (
              <View key={entry.id} className="mt-2">
                <Typography variant="body">
                  {entry.dogName} — {entry.title}
                </Typography>
                <Typography variant="caption" className="text-muted">
                  {dueWording(entry.nextDueDate) ?? entry.eventDate}
                </Typography>
              </View>
            ))
          )}
        </Card>
      </Pressable>
    </Link>
  );
}
