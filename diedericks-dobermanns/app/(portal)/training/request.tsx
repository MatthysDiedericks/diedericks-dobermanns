import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { usePortalDogs } from '@/hooks/usePortal';
import { useSessionTypes } from '@/hooks/useTraining';
import { createBooking, useSubmitting } from '@/hooks/useMutations';
import { useAuthStore } from '@/stores/authStore';

const FOCUS_OPTIONS = [
  { value: 'puppy_foundation', label: 'Puppy foundation' },
  { value: 'obedience', label: 'Obedience' },
  { value: 'protection_foundation', label: 'Protection foundation' },
  { value: 'behaviour_problem', label: 'Behaviour problem' },
  { value: 'other', label: 'Something else' },
] as const;

/**
 * Owner enquiry — writes training_bookings with status pending and
 * client_notes starting with [TRAINING_REQUEST]. Not a booking.
 */
export default function TrainingRequestScreen() {
  const clientId = useAuthStore((s) => s.profile?.id);
  const { dogs } = usePortalDogs();
  const { data: types } = useSessionTypes(true);
  const { submitting, run } = useSubmitting();

  const [dogId, setDogId] = useState<string | null>(null);
  const [focus, setFocus] = useState<string>(FOCUS_OPTIONS[0].value);
  const [timing, setTiming] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (!clientId) return;
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please add a short message.');
      return;
    }
    const sessionType = types[0];
    if (!sessionType) {
      setError('Training is not set up yet. Please WhatsApp the kennel instead.');
      return;
    }

    const focusLabel = FOCUS_OPTIONS.find((o) => o.value === focus)?.label ?? focus;
    const timingLabel = timing.trim() || 'Not specified';
    const clientNotes = [
      '[TRAINING_REQUEST]',
      `Focus: ${focusLabel}`,
      `Preferred timing: ${timingLabel}`,
      '',
      trimmed,
    ].join('\n');

    const scheduled = new Date();
    scheduled.setDate(scheduled.getDate() + 14);
    scheduled.setHours(10, 0, 0, 0);

    const { error: err } = await run(() =>
      createBooking(
        {
          session_type_id: sessionType.id,
          availability_id: null,
          scheduled_at: scheduled.toISOString(),
          duration_minutes: sessionType.duration_minutes,
          session_format:
            sessionType.session_format === 'both' ? 'in_person' : sessionType.session_format,
          dog_id: dogId ?? dogs[0]?.id ?? null,
          client_notes: clientNotes,
        },
        clientId,
      ),
    );
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Training" title="Request received" />
        <View className="px-6">
          <Card>
            <Typography variant="subtitle">We have your request and will come back to you.</Typography>
            <Typography variant="bodyMuted" className="mt-2">
              Nothing is booked yet.
            </Typography>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboardShouldPersistTaps="handled">
      <PageHeader eyebrow="Training" title="Request training" />
      <View className="px-6 pb-10">
        <Typography variant="bodyMuted" className="mb-4">
          Tell us what you need. We will reply — this is not a booking.
        </Typography>

        {dogs.length > 0 ? (
          <View className="mb-4">
            <Typography variant="label" className="mb-2">
              Which dog
            </Typography>
            <View className="flex-row flex-wrap gap-2">
              {dogs.map((d) => {
                const active = (dogId ?? dogs[0]?.id) === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => setDogId(d.id)}
                    className={`rounded-xl border px-4 py-2.5 ${
                      active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                    }`}
                  >
                    <Typography variant="caption" className={active ? 'text-gold' : ''}>
                      {d.name}
                    </Typography>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Typography variant="label" className="mb-2">
          What are you after
        </Typography>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {FOCUS_OPTIONS.map((o) => {
            const active = focus === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => setFocus(o.value)}
                className={`rounded-xl border px-3 py-2 ${
                  active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                }`}
              >
                <Typography variant="caption" className={active ? 'text-gold' : ''}>
                  {o.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Preferred timing"
          value={timing}
          onChangeText={setTiming}
          placeholder="e.g. weekday mornings, next month"
          className="mb-3"
        />
        <Input
          label="Your message *"
          value={message}
          onChangeText={setMessage}
          multiline
          className="mb-3 h-28"
          placeholder="Tell us what you need help with…"
        />

        {error ? (
          <Typography variant="caption" className="mb-3 text-danger">
            {error}
          </Typography>
        ) : null}

        <Button
          label="Send request"
          onPress={submit}
          loading={submitting}
          disabled={!message.trim()}
          fullWidth
        />
      </View>
    </ScreenContainer>
  );
}
