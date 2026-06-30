import { useMemo, useRef } from 'react';
import { Alert, View } from 'react-native';

import {
  AddLitterEventSheet,
  type AddLitterEventSheetHandle,
} from '@/components/litters/AddLitterEventSheet';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useLitterCalendar } from '@/hooks/useLitterCalendar';
import {
  formatLitterEventDate,
  groupEventsByWeek,
  isEventOverdue,
  litterEventTypeLabel,
} from '@/lib/litters/calendarHelpers';

const TYPE_TONE: Record<string, BadgeTone> = {
  vet_visit: 'neutral',
  weigh_day: 'gold',
  deworming: 'success',
  vaccination: 'neutral',
  handover: 'gold',
};

export function LitterCalendarTab({
  litterId,
  puppyIds,
}: {
  litterId: string;
  puppyIds: string[];
}) {
  const sheetRef = useRef<AddLitterEventSheetHandle>(null);
  const { events, loading, addEvent } = useLitterCalendar(litterId, puppyIds);

  const weeks = useMemo(() => groupEventsByWeek(events), [events]);

  async function handleAdd(input: Parameters<typeof addEvent>[0]) {
    try {
      await addEvent(input);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save event');
    }
  }

  return (
    <View className="pb-8">
      <Button label="+ Add Event" onPress={() => sheetRef.current?.open()} fullWidth className="mb-4" />

      {loading ? (
        <Typography variant="bodyMuted">Loading calendar…</Typography>
      ) : events.length === 0 ? (
        <EmptyState
          title="No events scheduled — tap + to add your first milestone"
        />
      ) : (
        weeks.map((group) => (
          <View key={group.week} className="mb-6">
            <Typography variant="label" className="mb-3 text-gold">
              {group.label.toUpperCase()}
            </Typography>
            {group.items.map((event) => {
              const overdue = isEventOverdue(event.event_date, event.is_completed);
              return (
                <Card key={event.id} className="mb-2">
                  <View className="flex-row items-start">
                    {overdue ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: Colors.danger,
                          marginTop: 6,
                          marginRight: 8,
                        }}
                      />
                    ) : (
                      <View className="mr-2 w-2" />
                    )}
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Typography variant="subtitle">{event.title}</Typography>
                        <Badge
                          label={litterEventTypeLabel(event.event_type)}
                          tone={TYPE_TONE[event.event_type] ?? 'muted'}
                        />
                      </View>
                      <Typography variant="caption" className="mt-1 text-gold">
                        {formatLitterEventDate(event.event_date)}
                      </Typography>
                      {event.notes ? (
                        <Typography variant="bodyMuted" className="mt-2">
                          {event.notes}
                        </Typography>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        ))
      )}

      <AddLitterEventSheet ref={sheetRef} onSave={handleAdd} />
    </View>
  );
}
