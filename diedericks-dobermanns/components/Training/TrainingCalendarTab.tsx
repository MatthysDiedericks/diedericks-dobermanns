import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BookingCard } from '@/components/Training/BookingCard';
import { TRAINING_MONTHS } from '@/components/Training/trainingFormatters';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAdminTrainingBookings } from '@/hooks/useTraining';

export function TrainingCalendarTab() {
  const { data: bookings } = useAdminTrainingBookings();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach((b) => {
      const key = b.scheduled_at.slice(0, 10);
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [bookings]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function key(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  function shift(delta: number) {
    const m = month + delta;
    if (m < 0) {
      setMonth(11);
      setYear(year - 1);
    } else if (m > 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(m);
    setSelected(null);
  }

  const dayBookings = selected ? bookings.filter((b) => b.scheduled_at.slice(0, 10) === selected) : [];

  return (
    <View className="px-6">
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable onPress={() => shift(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.gold} />
        </Pressable>
        <Typography variant="subtitle">{TRAINING_MONTHS[month]} {year}</Typography>
        <Pressable onPress={() => shift(1)} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={Colors.gold} />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <View key={i} style={{ width: `${100 / 7}%` }} className="items-center py-1">
            <Typography variant="caption" className="text-silver">{d}</Typography>
          </View>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={`b-${i}`} style={{ width: `${100 / 7}%` }} className="h-12" />;
          const k = key(day);
          const count = counts[k] ?? 0;
          const active = selected === k;
          return (
            <Pressable
              key={k}
              onPress={() => setSelected(active ? null : k)}
              style={{ width: `${100 / 7}%` }}
              className="h-12 items-center justify-center"
            >
              <View className={`h-9 w-9 items-center justify-center rounded-full ${active ? 'bg-gold/20' : ''}`}>
                <Typography variant="body">{day}</Typography>
                {count > 0 ? <View className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-gold" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <View className="mt-6 gap-3">
          <Typography variant="label">{dayBookings.length} booking(s)</Typography>
          {dayBookings.map((b) => (
            <BookingCard key={b.id} booking={b} compact />
          ))}
        </View>
      ) : null}
    </View>
  );
}
