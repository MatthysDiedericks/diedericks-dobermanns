import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAvailability, useMyDogs, useSessionTypes } from '@/hooks/useTraining';
import { createBooking, useSubmitting, type BookingInput } from '@/hooks/useMutations';
import { useAuthStore } from '@/stores/authStore';
import type { SessionFormat, TrainingAvailability, TrainingSessionType } from '@/types/app.types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function next7Days(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function formatLabel(fmt: SessionFormat): string {
  if (fmt === 'in_person') return 'In Person';
  if (fmt === 'video_call') return 'Video Call';
  return 'In Person or Video';
}

export default function BookSessionScreen() {
  const router = useRouter();
  const clientId = useAuthStore((s) => s.profile?.id);
  const { data: types } = useSessionTypes(true);
  const { data: slots } = useAvailability();
  const { data: myDogs } = useMyDogs();
  const { submitting, run } = useSubmitting();

  const [typeId, setTypeId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<TrainingAvailability | null>(null);
  const [clientNotes, setClientNotes] = useState('');
  const [dogId, setDogId] = useState<string | null>(null);
  const [format, setFormat] = useState<SessionFormat>('in_person');
  const [done, setDone] = useState(false);

  const selectedType = types.find((t) => t.id === typeId) ?? null;
  const week = useMemo(() => next7Days(), []);

  function slotsForDate(d: string): TrainingAvailability[] {
    return slots.filter(
      (s) =>
        s.available_date === d &&
        !s.is_blocked &&
        (s.session_type_id === typeId || s.session_type_id === null) &&
        (s.booked_count ?? 0) < s.max_bookings,
    );
  }
  function dayHasSlots(d: string): boolean {
    return slotsForDate(d).length > 0;
  }

  function chooseType(t: TrainingSessionType) {
    setTypeId(t.id);
    setDate(null);
    setSlot(null);
    setFormat(t.session_format === 'both' ? 'in_person' : t.session_format);
  }

  async function submit() {
    if (!selectedType || !slot || !date || !clientId) return;
    const input: BookingInput = {
      session_type_id: selectedType.id,
      availability_id: slot.id,
      scheduled_at: `${date}T${slot.start_time}:00`,
      duration_minutes: selectedType.duration_minutes,
      session_format: format,
      dog_id: dogId,
      client_notes: clientNotes.trim() || null,
    };
    const { error } = await run(() => createBooking(input, clientId));
    if (!error) setDone(true);
  }

  if (done) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Training" title="Request Sent" />
        <View className="px-6">
          <Card className="items-center py-8">
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            <Typography variant="subtitle" className="mt-4 text-center">
              Your request has been received
            </Typography>
            <Typography variant="bodyMuted" className="mt-2 text-center">
              We will confirm within 24 hours. You can track it under My Sessions.
            </Typography>
          </Card>
          <Button
            label="View My Sessions"
            onPress={() => router.replace('/(portal)/training/bookings')}
            fullWidth
            className="mt-6"
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboardShouldPersistTaps="handled">
      <PageHeader eyebrow="Training" title="Book a Session" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6" contentContainerStyle={{ gap: 8 }}>
        <Pressable
          onPress={() => router.push('/(portal)/training/bookings')}
          className="rounded-full border border-gold/30 px-4 py-2"
        >
          <Typography variant="caption">My Sessions</Typography>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(portal)/training/videos/index' as never)}
          className="rounded-full border border-gold bg-gold/15 px-4 py-2"
        >
          <Typography variant="caption" className="text-gold">
            Training Library
          </Typography>
        </Pressable>
      </ScrollView>

      <View className="px-6">
        {/* Session types */}
        <SectionHeader eyebrow="Step 1" title="Choose a Session" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
      >
        {types.map((t) => {
          const active = typeId === t.id;
          return (
            <Pressable key={t.id} onPress={() => chooseType(t)} style={{ width: 240 }}>
              <Card className={active ? 'border border-gold' : ''}>
                <Typography variant="subtitle" className="text-gold">
                  {t.name}
                </Typography>
                <Typography variant="caption" className="mt-1" numberOfLines={3}>
                  {t.description}
                </Typography>
                <View className="mt-3 flex-row items-center justify-between">
                  <Badge label={formatLabel(t.session_format)} tone="neutral" />
                  <Typography variant="caption">{t.duration_minutes} min</Typography>
                </View>
                <Typography variant="caption" className="mt-1 text-gold">
                  {t.price ? `${t.currency} ${t.price}` : 'Free'}
                </Typography>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Calendar week */}
      {selectedType ? (
        <View className="mt-8 px-6">
          <SectionHeader eyebrow="Step 2" title="Pick a Day" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {week.map((d) => {
              const has = dayHasSlots(d);
              const active = date === d;
              const dt = new Date(`${d}T00:00:00`);
              return (
                <Pressable
                  key={d}
                  disabled={!has}
                  onPress={() => {
                    setDate(d);
                    setSlot(null);
                  }}
                  className={`h-20 w-16 items-center justify-center rounded-xl border ${
                    active
                      ? 'border-gold bg-gold/15'
                      : has
                        ? 'border-gold/30 bg-surface'
                        : 'border-border bg-surface opacity-40'
                  }`}
                >
                  <Typography variant="caption" className={has ? 'text-gold' : 'text-silver'}>
                    {WEEKDAYS[dt.getDay()]}
                  </Typography>
                  <Typography variant="subtitle" className={has ? '' : 'text-silver'}>
                    {dt.getDate()}
                  </Typography>
                  <Typography variant="caption" className="text-silver">
                    {MONTHS[dt.getMonth()]}
                  </Typography>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Time slots */}
      {selectedType && date ? (
        <View className="mt-8 px-6">
          <SectionHeader eyebrow="Step 3" title="Pick a Time" />
          <View className="flex-row flex-wrap gap-2">
            {slotsForDate(date).map((s) => {
              const active = slot?.id === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSlot(s)}
                  className={`rounded-xl border px-4 py-3 ${active ? 'border-gold bg-gold/15' : 'border-gold/30 bg-surface'}`}
                >
                  <Typography variant="body" className={active ? 'text-gold' : ''}>
                    {s.start_time}–{s.end_time}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Booking form */}
      {selectedType && slot ? (
        <View className="mt-8 px-6">
          <SectionHeader eyebrow="Step 4" title="Details" />

          {selectedType.session_format === 'both' ? (
            <View className="mb-4">
              <Typography variant="label" className="mb-2">
                Format
              </Typography>
              <View className="flex-row gap-3">
                <Button
                  label="In Person"
                  variant={format === 'in_person' ? 'primary' : 'secondary'}
                  onPress={() => setFormat('in_person')}
                  className="flex-1"
                />
                <Button
                  label="Video Call"
                  variant={format === 'video_call' ? 'primary' : 'secondary'}
                  onPress={() => setFormat('video_call')}
                  className="flex-1"
                />
              </View>
            </View>
          ) : null}

          {myDogs.length > 0 ? (
            <View className="mb-4">
              <Typography variant="label" className="mb-2">
                Which dog? (optional)
              </Typography>
              <View className="flex-row flex-wrap gap-2">
                {myDogs.map((d) => {
                  const active = dogId === d.id;
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => setDogId(active ? null : d.id)}
                      className={`rounded-xl border px-4 py-2.5 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
                    >
                      <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                        {d.name}
                      </Typography>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Input
            label="What would you like to work on?"
            value={clientNotes}
            onChangeText={setClientNotes}
            multiline
            className="h-28"
            placeholder="Tell us about your goals for the session…"
          />

          <Button label="Request Session" onPress={submit} loading={submitting} fullWidth className="mt-2" />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
