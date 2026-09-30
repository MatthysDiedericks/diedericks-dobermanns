import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { stageLabel } from '@/lib/waitlist/constants';
import {
  compareLongestWait,
  daysWaiting,
  isLongWait,
  type LitterQueueEntry,
} from '@/lib/waitlist/litterQueue';
import { setWaitlistHold, updateWaitlistEntry } from '@/lib/waitlist/mutations';
import {
  allocationBlockReason,
  attributeMatch,
  isAllocatablePuppy,
  livePuppySummary,
  noteNeedsReading,
  preferenceValueLabel,
  puppyChoiceLabel,
  sexBlockCopy,
  supplyDemandSummary,
  tierChipLabel,
  type AttributeMark,
  type ChoiceBuyer,
  type ChoicePuppy,
} from '@/lib/waitlist/allocationDecision';

export type AppLitterQueueRow = LitterQueueEntry &
  ChoiceBuyer & {
    id: string;
    name: string;
    pipeline_stage: string | null;
    payment_status: string | null;
    assigned_dog_id: string | null;
    assigned_litter_id?: string | null;
    hold_reason?: string | null;
    hold_until?: string | null;
  };

function depositLabel(status: string | null): string {
  if (status === 'deposit_paid') return 'Deposit paid';
  if (status === 'paid_in_full') return 'Paid in full';
  return 'Deposit not paid';
}

function markGlyph(mark: AttributeMark): string {
  if (mark === 'met') return '✓';
  if (mark === 'unknown') return '⚠';
  return '✗';
}

function preferenceLine(row: ChoiceBuyer): string {
  return [
    `Sex ${preferenceValueLabel(row.preferred_sex, 'sex')}`,
    `Colour ${preferenceValueLabel(row.preferred_colour, 'colour')}`,
    `Tail ${preferenceValueLabel(row.tail_preference, 'tail')}`,
    `Ears ${preferenceValueLabel(row.ear_preference, 'ears')}`,
  ].join(' · ');
}

export function LitterQueuePanels({
  allocated,
  general,
  puppies,
  demandEntries,
  now,
  onAllocate,
  onChanged,
}: {
  allocated: AppLitterQueueRow[];
  general: AppLitterQueueRow[];
  puppies: ChoicePuppy[];
  demandEntries?: ChoiceBuyer[];
  now: Date;
  onAllocate: (waitlistId: string, dogId: string, sexOverride?: string) => Promise<string | null>;
  onChanged?: () => void;
}) {
  const waiting = [...general].sort(compareLongestWait);
  const live = puppies.filter(isAllocatablePuppy);
  const summary = livePuppySummary(puppies);
  const demand = supplyDemandSummary(demandEntries ?? waiting, puppies);

  return (
    <View className="mb-6">
      <View className="mb-4 rounded-xl border border-gold/30 bg-gold/5 px-3 py-3">
        <Typography variant="label" className="mb-2">
          This litter against the queue
        </Typography>
        <Typography variant="caption">{summary.countLine}</Typography>
        <Typography variant="caption" className="mt-1">
          {summary.colourLine}
        </Typography>
        {demand.lines.map((line) => (
          <Typography key={line.label} variant="caption" className="mt-1">
            {line.label}: {line.value}
          </Typography>
        ))}
        {demand.colourGaps.map((gap) => (
          <Typography key={gap} variant="caption" className="mt-1 text-red-300">
            {gap}
          </Typography>
        ))}
      </View>

      <Typography variant="label" className="mb-2">
        Allocated to this litter ({allocated.length})
      </Typography>
      {allocated.length === 0 ? (
        <Typography variant="caption" className="mb-4 text-subtle">
          Nobody is allocated to this litter yet.
        </Typography>
      ) : (
        allocated.map((row) => {
          const pup = puppies.find((p) => p.id === row.assigned_dog_id);
          return <AllocatedRow key={row.id} row={row} pup={pup} />;
        })
      )}

      <Typography variant="label" className="mb-2 mt-2">
        Waiting for a litter ({waiting.length})
      </Typography>
      {waiting.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          The general queue is empty.
        </Typography>
      ) : (
        waiting.map((row) => (
          <QueueWaitRow
            key={row.id}
            row={row}
            days={daysWaiting(row, now)}
            puppies={live}
            onAllocate={onAllocate}
            onChanged={onChanged}
          />
        ))
      )}
    </View>
  );
}

function AllocatedRow({ row, pup }: { row: AppLitterQueueRow; pup?: ChoicePuppy }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/(admin)/waitlist/${row.id}` as never)}
      className="mb-2 rounded-xl border border-gold/20 px-3 py-2"
    >
      <Typography variant="subtitle">{row.name}</Typography>
      <Typography variant="caption" className="text-subtle">
        {stageLabel(row.pipeline_stage)} · {depositLabel(row.payment_status)}
      </Typography>
      <Typography variant="caption">{tierChipLabel(row.preferred_category)}</Typography>
      <Typography variant="caption">{preferenceLine(row)}</Typography>
      <Typography variant="caption" className="text-gold">
        {pup ? `Matched ${puppyChoiceLabel(pup)}` : 'No puppy matched yet'}
      </Typography>
    </Pressable>
  );
}

function QueueWaitRow({
  row,
  days,
  puppies,
  onAllocate,
  onChanged,
}: {
  row: AppLitterQueueRow;
  days: number | null;
  puppies: ChoicePuppy[];
  onAllocate: (waitlistId: string, dogId: string, sexOverride?: string) => Promise<string | null>;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sexOverride, setSexOverride] = useState('');
  const [showHold, setShowHold] = useState(false);
  const [holdUntil, setHoldUntil] = useState(row.hold_until?.slice(0, 10) ?? '');
  const [holdReason, setHoldReason] = useState(row.hold_reason ?? '');
  const [showPreference, setShowPreference] = useState(false);
  const long = isLongWait(days);
  const selected = puppies.find((p) => p.id === picked) ?? null;
  const sexBlock = selected ? sexBlockCopy(row, selected) : null;
  const readNote = noteNeedsReading(row.preference_notes);

  async function allocate(override: string | null) {
    if (!selected) return;
    const blocked = allocationBlockReason({
      puppy: selected,
      preferredSex: row.preferred_sex,
      sexOverride: override,
    });
    if (blocked) {
      setError(blocked);
      return;
    }
    setBusy(true);
    setError(null);
    const message = await onAllocate(row.id, selected.id, override ?? undefined);
    setBusy(false);
    if (message) setError(message);
    else setOpen(false);
  }

  return (
    <View className={`mb-3 rounded-xl border px-3 py-2 ${long ? 'border-amber-400/50' : 'border-gold/20'}`}>
      <Pressable onPress={() => router.push(`/(admin)/waitlist/${row.id}` as never)}>
        <Typography variant="subtitle">{row.name}</Typography>
        <Typography variant="caption" className={long ? 'text-amber-200' : 'text-subtle'}>
          {days == null ? 'Wait unknown' : `${days} days`}
          {long ? ' · past 90 days' : ''} · {stageLabel(row.pipeline_stage)} · {depositLabel(row.payment_status)}
        </Typography>
      </Pressable>
      <Typography variant="caption" className="mt-2 text-gold">
        {tierChipLabel(row.preferred_category)}
      </Typography>
      <Typography variant="caption" className="mt-1">
        {preferenceLine(row)}
      </Typography>
      <Typography variant="caption" className="mt-1 text-subtle">
        Registration {preferenceValueLabel(row.registration_type, 'registration')}
      </Typography>
      <Typography variant="caption" className="mt-2 text-subtle">
        Notes
      </Typography>
      <Typography variant="caption">{row.preference_notes?.trim() || 'No notes'}</Typography>
      {readNote ? (
        <Typography variant="caption" className="mt-1 text-amber-200">
          Read the note
        </Typography>
      ) : null}
      {row.admin_notes?.trim() ? (
        <Typography variant="caption" className="mt-2">
          Admin notes: {row.admin_notes.trim()}
        </Typography>
      ) : null}
      {row.hold_until ? (
        <Typography variant="caption" className="mt-2 text-amber-200">
          On hold until {row.hold_until.slice(0, 10)}
          {row.hold_reason?.trim() ? ` · ${row.hold_reason.trim()}` : ''}
        </Typography>
      ) : null}

      {puppies.map((puppy) => (
        <View key={puppy.id} className="mt-2 rounded-lg border border-gold/15 px-2 py-2">
          <Typography variant="caption">{puppyChoiceLabel(puppy)}</Typography>
          {attributeMatch(row, puppy).map((line) => (
            <Typography
              key={line.key}
              variant="caption"
              className={line.mark === 'met' ? 'text-emerald-400' : line.mark === 'unknown' ? 'text-amber-300' : 'text-red-300'}
            >
              {line.label} {markGlyph(line.mark)} {line.text}
            </Typography>
          ))}
        </View>
      ))}

      <Button
        label={open ? 'Choose a puppy' : 'Allocate to a puppy'}
        size="sm"
        variant="secondary"
        onPress={() => setOpen((v) => !v)}
        className="mt-2"
      />
      {open
        ? puppies.map((pup) => (
            <Pressable
              key={pup.id}
              disabled={busy}
              onPress={() => {
                setPicked(pup.id);
                setError(null);
                setSexOverride('');
              }}
              className={`mt-1 rounded-lg border px-3 py-2 ${picked === pup.id ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
            >
              <Typography variant="caption">{puppyChoiceLabel(pup)}</Typography>
            </Pressable>
          ))
        : null}
      {picked && !sexBlock ? (
        <Button label={busy ? 'Allocating…' : 'Allocate'} size="sm" onPress={() => void allocate(null)} className="mt-2" />
      ) : null}
      {sexBlock ? (
        <View className="mt-2">
          <Typography variant="caption" className="text-red-300">
            {sexBlock}
          </Typography>
          <TextInput
            value={sexOverride}
            onChangeText={setSexOverride}
            placeholder="What is being overridden"
            placeholderTextColor="#8a8070"
            className="mt-2 rounded-lg border border-red-400/40 px-3 py-2 text-ink"
          />
          <Button
            label="Override sex and allocate"
            size="sm"
            onPress={() => void allocate(sexOverride)}
            className="mt-2"
          />
        </View>
      ) : null}

      <View className="mt-2 flex-row gap-2">
        <Button label="Set hold" size="sm" variant="secondary" onPress={() => setShowHold((v) => !v)} />
        <Button label="Set preference" size="sm" variant="secondary" onPress={() => setShowPreference((v) => !v)} />
      </View>
      {showHold ? (
        <View className="mt-2">
          <TextInput
            value={holdReason}
            onChangeText={setHoldReason}
            placeholder="Reason"
            placeholderTextColor="#8a8070"
            className="rounded-lg border border-gold/25 px-3 py-2 text-ink"
          />
          <TextInput
            value={holdUntil}
            onChangeText={setHoldUntil}
            placeholder="Hold until YYYY-MM-DD"
            placeholderTextColor="#8a8070"
            className="mt-2 rounded-lg border border-gold/25 px-3 py-2 text-ink"
          />
          <Button
            label="Save hold"
            size="sm"
            className="mt-2"
            onPress={() => {
              setBusy(true);
              setError(null);
              void setWaitlistHold(row.id, holdUntil, holdReason).then((res) => {
                setBusy(false);
                if (res.error) setError(res.error);
                else onChanged?.();
              });
            }}
          />
        </View>
      ) : null}
      {showPreference ? (
        <PreferenceEditor
          row={row}
          onError={setError}
          onSaved={() => {
            onChanged?.();
            setShowPreference(false);
          }}
        />
      ) : null}
      {error ? (
        <Typography variant="caption" className="mt-2 text-red-300">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}

function PreferenceEditor({
  row,
  onError,
  onSaved,
}: {
  row: AppLitterQueueRow;
  onError: (message: string | null) => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState(row.preferred_category || 'any');
  const [sex, setSex] = useState(row.preferred_sex || 'no_preference');
  const [colour, setColour] = useState(row.preferred_colour || 'no_preference');
  const [tail, setTail] = useState(row.tail_preference || 'no_preference');
  const [ears, setEars] = useState(row.ear_preference || 'no_preference');
  const [registration, setRegistration] = useState(row.registration_type ?? '');

  return (
    <View className="mt-2">
      <ChipRow label="Tier" value={category} options={['elite_developed', 'standard', 'protection_dog', 'any']} onChange={setCategory} />
      <ChipRow label="Sex" value={sex} options={['male', 'female', 'no_preference']} onChange={setSex} />
      <ChipRow label="Colour" value={colour} options={['black_tan', 'brown_tan', 'no_preference']} onChange={setColour} />
      <ChipRow label="Tail" value={tail} options={['docked', 'natural', 'no_preference']} onChange={setTail} />
      <ChipRow label="Ears" value={ears} options={['cropped', 'natural', 'no_preference']} onChange={setEars} />
      <TextInput
        value={registration}
        onChangeText={setRegistration}
        placeholder="Registration"
        placeholderTextColor="#8a8070"
        className="mt-2 rounded-lg border border-gold/25 px-3 py-2 text-ink"
      />
      <Button
        label="Save preference"
        size="sm"
        className="mt-2"
        onPress={() => {
          onError(null);
          void updateWaitlistEntry(row.id, {
            preferred_category: category,
            preferred_sex: sex,
            preferred_colour: colour,
            tail_preference: tail,
            ear_preference: ears,
            registration_type: registration.trim() || null,
          }).then((res) => {
            if (res.error) onError(res.error);
            else onSaved();
          });
        }}
      />
    </View>
  );
}

function ChipRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <View className="mt-2">
      <Typography variant="caption" className="text-subtle">
        {label}
      </Typography>
      <View className="mt-1 flex-row flex-wrap gap-1">
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            className={`rounded-full border px-2 py-1 ${value === option ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
          >
            <Typography variant="caption">{option.replace(/_/g, ' ')}</Typography>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
