import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useCalendarEvents, useCalendarViewMode } from '@/hooks/useCalendarEvents';
import type { CalendarEvent, CalendarViewMode } from '@/types/phase10';

const MODES: CalendarViewMode[] = ['day', 'week', 'month', 'year'];

function MonthGrid({
  month,
  events,
  selected,
  onSelect,
}: {
  month: Date;
  events: CalendarEvent[];
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <View className="flex-row flex-wrap">
      {days.map((d) => {
        const dayEvents = events.filter((e) => isSameDay(parseISO(e.date.slice(0, 10)), d));
        const inMonth = d.getMonth() === month.getMonth();
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onSelect(d)}
            className="w-[14.28%] aspect-square items-center justify-center border border-gold/10"
            style={{ opacity: inMonth ? 1 : 0.35 }}
          >
            <Typography variant="caption">{format(d, 'd')}</Typography>
            <View className="flex-row mt-1 gap-0.5">
              {dayEvents.slice(0, 3).map((e) => (
                <View key={e.id} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: e.colour }} />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { mode, setMode } = useCalendarViewMode();
  const [anchor, setAnchor] = useState(new Date());
  const monthStart = format(startOfMonth(anchor), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(anchor), 'yyyy-MM-dd');
  const { events, loading, refresh } = useCalendarEvents(monthStart, monthEnd);

  const dayEvents = useMemo(
    () => events.filter((e) => isSameDay(parseISO(e.date.slice(0, 10)), anchor)),
    [events, anchor],
  );

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Schedule" title="Calendar" back={false} />
      <ScrollView className="px-6 pb-12">
        <View className="flex-row flex-wrap gap-2 mb-4">
          {MODES.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              className={`rounded-full px-3 py-1 border ${mode === m ? 'border-gold bg-gold/20' : 'border-gold/30'}`}
            >
              <Typography variant="caption">{m}</Typography>
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={() => setAnchor(addMonths(anchor, -1))}>
            <Typography variant="label">←</Typography>
          </Pressable>
          <Typography variant="subtitle">{format(anchor, 'MMMM yyyy')}</Typography>
          <Pressable onPress={() => setAnchor(addMonths(anchor, 1))}>
            <Typography variant="label">→</Typography>
          </Pressable>
        </View>

        {mode === 'month' || mode === 'week' ? (
          <MonthGrid month={anchor} events={events} selected={anchor} onSelect={setAnchor} />
        ) : null}

        {mode === 'year' ? (
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const m = new Date(anchor.getFullYear(), i, 1);
              const has = events.some((e) => parseISO(e.date).getMonth() === i);
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    setAnchor(m);
                    setMode('month');
                  }}
                  className={`w-[30%] p-3 rounded-xl border ${has ? 'border-gold bg-gold/10' : 'border-gold/20'}`}
                >
                  <Typography variant="caption">{format(m, 'MMM')}</Typography>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Typography variant="label" className="mt-6 mb-2 text-gold">
          {mode === 'day' ? 'DAY' : 'SELECTED DAY'} — {format(anchor, 'dd MMM yyyy')}
        </Typography>
        <FlatList
          data={dayEvents}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />}
          ListEmptyComponent={
            <Typography variant="caption" className="text-subtle">No events this day.</Typography>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (item.route && item.params) {
                  router.push({ pathname: item.route, params: item.params } as never);
                }
              }}
            >
              <Card className="mb-2">
                <View className="flex-row items-center gap-2">
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.colour }} />
                  <Typography variant="body">{item.title}</Typography>
                </View>
                <Typography variant="caption" className="mt-1 text-subtle">
                  {item.type}
                </Typography>
              </Card>
            </Pressable>
          )}
        />
      </ScrollView>
    </ScreenContainer>
  );
}
