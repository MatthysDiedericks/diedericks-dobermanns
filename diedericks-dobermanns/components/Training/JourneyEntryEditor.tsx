import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { saveJourneyEntry } from '@/lib/training/journeyMutations';
import {
  PHASES,
  PROGRESS_LEVELS,
  TRAINING_TYPES,
  type JourneyEntry,
} from '@/lib/training/journeyTypes';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          label={opt.label}
          size="sm"
          variant={value === opt.value ? 'solid' : 'outline'}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}

export function JourneyEntryEditor({
  dogId,
  entry,
  onClose,
  onSaved,
}: {
  dogId: string;
  entry: JourneyEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sessionDate, setSessionDate] = useState(entry?.session_date ?? todayIso());
  const [trainingType, setTrainingType] = useState(entry?.training_type ?? 'session');
  const [phase, setPhase] = useState(entry?.phase ?? '');
  const [progressLevel, setProgressLevel] = useState(entry?.progress_level ?? '');
  const [milestone, setMilestone] = useState(entry?.milestone ?? '');
  const [durationMinutes, setDurationMinutes] = useState(
    entry?.duration_minutes?.toString() ?? '',
  );
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [isPublic, setIsPublic] = useState(entry?.is_public ?? false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await saveJourneyEntry(dogId, entry?.id ?? null, {
        session_date: sessionDate,
        training_type: trainingType,
        phase: phase || null,
        progress_level: progressLevel || null,
        milestone: milestone.trim() || null,
        duration_minutes: durationMinutes ? Number(durationMinutes) : null,
        notes: notes.trim() || null,
        is_public: isPublic,
      });
      showSaved();
      onSaved();
      onClose();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save the entry.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="mb-4 rounded-sm border border-gold/30 bg-surface p-4">
      <Input label="Session date (YYYY-MM-DD)" value={sessionDate} onChangeText={setSessionDate} />
      <Typography variant="caption" className="mb-2 text-silver">
        Training type
      </Typography>
      <ChipRow options={TRAINING_TYPES} value={trainingType} onChange={setTrainingType} />
      <Typography variant="caption" className="mb-2 text-silver">
        Phase
      </Typography>
      <ChipRow
        options={[{ value: '', label: 'None' }, ...PHASES]}
        value={phase}
        onChange={setPhase}
      />
      <Typography variant="caption" className="mb-2 text-silver">
        Progress
      </Typography>
      <ChipRow
        options={[{ value: '', label: 'Not set' }, ...PROGRESS_LEVELS]}
        value={progressLevel}
        onChange={setProgressLevel}
      />
      <Input label="Milestone" value={milestone} onChangeText={setMilestone} />
      <Input
        label="Duration (minutes)"
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        keyboardType="number-pad"
      />
      <Input label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Button
        label={isPublic ? 'Published on the public timeline' : 'Private — tap to publish'}
        size="sm"
        variant={isPublic ? 'solid' : 'outline'}
        onPress={() => setIsPublic((v) => !v)}
      />
      <View className="mt-4 flex-row gap-2">
        <Button label="Save" loading={busy} onPress={() => void save()} />
        <Button label="Cancel" variant="outline" onPress={onClose} />
      </View>
    </View>
  );
}
