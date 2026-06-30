import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import {
  useActiveHeat,
  useAddHeatCycle,
  useNextPredictedHeat,
  useUpdateHeatCycle,
} from '@/hooks/useHeatCycles';
import { notifyCalendarRefresh } from '@/lib/calendar/refresh';
import { addDays, daysUntil } from '@/lib/heats/calculations';
import { goHomeWindow } from '@/lib/dogs/whelpDates';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { parseDateInput, showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import type { Dog } from '@/types/app.types';

async function syncHeatCalendar(dog: Dog, estrusStart: string | null, expectedWhelp: string | null) {
  const rows: { title: string; event_date: string; event_type: string; dog_id: string }[] = [];
  if (estrusStart) {
    rows.push({
      title: `${dog.name} — Mating Window Opens`,
      event_date: estrusStart,
      event_type: 'heat',
      dog_id: dog.id,
    });
  }
  if (expectedWhelp) {
    rows.push({
      title: `${dog.name} — Expected Whelping`,
      event_date: expectedWhelp,
      event_type: 'heat',
      dog_id: dog.id,
    });
    const goHome = goHomeWindow(expectedWhelp);
    rows.push({
      title: `${dog.name} — Go Home Opens`,
      event_date: goHome.earliest,
      event_type: 'litter',
      dog_id: dog.id,
    });
  }
  if (rows.length === 0) return;
  await requireSupabase().from('calendar_events').insert(rows);
}

export function HeatStatusCard({ dog, onRefresh }: { dog: Dog; onRefresh: () => void }) {
  const router = useRouter();
  const { heat, refresh: refreshHeat } = useActiveHeat(dog.id);
  const { predicted } = useNextPredictedHeat(dog.id);
  const addHeat = useAddHeatCycle();
  const updateHeat = useUpdateHeatCycle();
  const [dateModal, setDateModal] = useState<'heat' | 'mating' | null>(null);
  const [dateInput, setDateInput] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  if (dog.sex !== 'female') return null;

  const matingClose = heat ? addDays(heat.heat_start_date, 19) : null;
  const projectedWhelp = heat?.mating_date
    ? addDays(heat.mating_date, 63)
    : heat?.expected_whelp_date ?? null;

  async function recordHeatStart() {
    const date = parseDateInput(dateInput);
    if (!date) {
      showError('Enter a valid date (YYYY-MM-DD).');
      return;
    }
    setSaving(true);
    try {
      await addHeat(dog.id, date);
      await refreshHeat();
      onRefresh();
      setDateModal(null);
    } catch {
      /* addHeat shows error */
    } finally {
      setSaving(false);
    }
  }

  async function recordMating() {
    if (!heat) return;
    const date = parseDateInput(dateInput);
    if (!date) {
      showError('Enter a valid date (YYYY-MM-DD).');
      return;
    }
    setSaving(true);
    try {
      const expectedWhelp = addDays(date, 63);
      await updateHeat(heat.id, { mating_date: date, expected_whelp_date: expectedWhelp });
      await syncHeatCalendar(dog, heat.estrus_start_date, expectedWhelp);
      notifyCalendarRefresh();
      showSaved(`Mating recorded ✓ Expected whelping: ${formatKennelDate(expectedWhelp)}`);
      await refreshHeat();
      onRefresh();
      setDateModal(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not record mating.');
    } finally {
      setSaving(false);
    }
  }

  if (!heat) {
    return (
      <>
        <SectionCard title="Heat & breeding cycle">
          <Typography variant="body" className="mb-1">
            Status: No active heat
          </Typography>
          {predicted ? (
            <Typography variant="caption" className="mb-3 text-subtle">
              Next predicted heat: ~{formatKennelDate(predicted.heat_start_date)}
            </Typography>
          ) : null}
          <Button label="+ Record Heat Start Date" variant="outline" onPress={() => setDateModal('heat')} fullWidth />
        </SectionCard>
        <DateModal
          visible={dateModal === 'heat'}
          title="Heat start date"
          value={dateInput}
          onChange={setDateInput}
          onClose={() => setDateModal(null)}
          onConfirm={() => void recordHeatStart()}
          saving={saving}
        />
      </>
    );
  }

  if (heat.mating_date) {
    const goHome = projectedWhelp ? goHomeWindow(projectedWhelp) : null;
    return (
      <SectionCard title="Heat & breeding cycle">
        <Typography variant="label" className="mb-2 text-gold">
          🟡 IN WHELP
        </Typography>
        <Typography variant="caption">Mated: {formatKennelDate(heat.mating_date)}</Typography>
        <Typography variant="caption">
          Sire:{' '}
          {heat.sire?.name ?? (
            <>
              Sire not recorded ·{' '}
              <Typography
                variant="caption"
                className="text-gold"
                onPress={() => router.push(`/(admin)/heats/${dog.id}` as never)}
              >
                Add Sire
              </Typography>
            </>
          )}
        </Typography>
        {projectedWhelp ? (
          <>
            <Typography variant="caption">Expected whelp: {formatKennelDate(projectedWhelp)}</Typography>
            <Typography variant="caption">
              Days remaining: {daysUntil(projectedWhelp) ?? '—'} days
            </Typography>
            {goHome ? (
              <Typography variant="caption" className="text-subtle">
                Go home window: {formatKennelDate(goHome.earliest)} – {formatKennelDate(goHome.latest)}
              </Typography>
            ) : null}
          </>
        ) : null}
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard title="Heat & breeding cycle">
        <Typography variant="label" className="mb-2 text-danger">
          🔴 ACTIVE HEAT
        </Typography>
        <Typography variant="caption">Heat started: {formatKennelDate(heat.heat_start_date)}</Typography>
        {heat.proestrus_start_date ? (
          <Typography variant="caption">Proestrus ends: {formatKennelDate(heat.estrus_start_date ?? heat.proestrus_start_date)}</Typography>
        ) : null}
        <View className="my-3 rounded-xl border border-gold/25 bg-black-rich p-3">
          <Typography variant="caption" className="mb-1 text-gold">
            MATING WINDOW
          </Typography>
          <Typography variant="caption">Opens: {formatKennelDate(heat.estrus_start_date ?? addDays(heat.heat_start_date, 9))}</Typography>
          <Typography variant="caption">
            Optimal: {formatKennelDate(heat.ovulation_date ?? addDays(heat.heat_start_date, 11))} –{' '}
            {formatKennelDate(addDays(heat.ovulation_date ?? addDays(heat.heat_start_date, 11), 6))}
          </Typography>
          <Typography variant="caption">Closes: {formatKennelDate(matingClose!)}</Typography>
        </View>
        <Typography variant="caption" className="mb-2">
          Mating recorded: Not yet
        </Typography>
        <Button label="✎ Record First Mating Date" variant="outline" onPress={() => setDateModal('mating')} fullWidth className="mb-2" />
        <Typography variant="caption" className="text-subtle">
          Expected whelping (if mated today): {formatKennelDate(addDays(new Date().toISOString().slice(0, 10), 63))}
        </Typography>
      </SectionCard>
      <DateModal
        visible={dateModal === 'mating'}
        title="First mating date"
        value={dateInput}
        onChange={setDateInput}
        onClose={() => setDateModal(null)}
        onConfirm={() => void recordMating()}
        saving={saving}
      />
    </>
  );
}

function DateModal({
  visible,
  title,
  value,
  onChange,
  onClose,
  onConfirm,
  saving,
}: {
  visible: boolean;
  title: string;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-black-rich p-6" onPress={() => undefined}>
          <Typography variant="subtitle" className="mb-4 text-gold">
            {title}
          </Typography>
          <Input label="Date (YYYY-MM-DD)" value={value} onChangeText={onChange} autoCapitalize="none" />
          <View className="mt-4 flex-row gap-2">
            <Button label="Cancel" variant="outline" onPress={onClose} className="flex-1" />
            <Button label="Confirm" onPress={onConfirm} loading={saving} className="flex-1" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
