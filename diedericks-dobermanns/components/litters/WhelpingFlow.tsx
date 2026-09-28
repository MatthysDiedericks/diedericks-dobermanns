import { useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { addDogMedia, addPuppyToLitter, finishWhelping } from '@/hooks/useMutations';
import { DOG_COLOUR_OPTIONS, type DogColourCode } from '@/lib/colours/dogColours';
import { COLLAR_COLOURS, collarLabel, type CollarColourId } from '@/lib/litters/collarColours';
import {
  formatBirthTime,
  formatWhelpingProgress,
  nowTimeHm,
  parseGrams,
  WHELPING_OUTCOME_BUTTONS,
} from '@/lib/litters/guide';
import type { PuppyOutcome } from '@/lib/litters/outcomes';
import {
  formatPuppySaved,
  intakeIsComplete,
  validatePuppyIntake,
  type IntakeErrors,
} from '@/lib/litters/puppyIntake';
import { resolvePhotoUrls } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';
import type { Dog } from '@/types/app.types';

export function WhelpingFlow({
  litterId,
  letter,
  pups,
  onSaved,
  onFinished,
}: {
  litterId: string;
  letter: string | null;
  pups: Dog[];
  onSaved: () => Promise<void> | void;
  onFinished: () => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const nextOrder = useMemo(() => {
    const orders = pups
      .map((p) => p.birth_order)
      .filter((n): n is number => n != null);
    return orders.length ? Math.max(...orders) + 1 : pups.length + 1;
  }, [pups]);
  const usedCollars = useMemo(
    () =>
      pups
        .map((p) => p.collar_colour)
        .filter((c): c is string => Boolean(c) && c !== 'none'),
    [pups],
  );

  const [outcome, setOutcome] = useState<PuppyOutcome>('live');
  const [time, setTime] = useState(() => nowTimeHm());
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [grams, setGrams] = useState('');
  const [collar, setCollar] = useState<CollarColourId | null>(null);
  const [tail, setTail] = useState<'docked' | 'natural' | null>(null);
  const [colour, setColour] = useState<DogColourCode | ''>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<IntakeErrors>({});
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [savedLine, setSavedLine] = useState<string | null>(null);
  const [birthType, setBirthType] = useState<'' | 'natural' | 'assisted' | 'c_section'>('');
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const gramsRef = useRef<TextInput>(null);

  const duplicateCollar =
    collar != null && collar !== 'none' && usedCollars.includes(collar);

  function resetForm() {
    setOutcome('live');
    setTime(nowTimeHm());
    setSex('male');
    setGrams('');
    setCollar(null);
    setTail(null);
    setColour('');
    setPhotos([]);
    setError(null);
    setFieldErrors({});
    setAllowDuplicate(false);
    setBirthType('');
    gramsRef.current?.focus();
  }

  async function save() {
    setError(null);
    setPhotoNote(null);
    const parsed = grams.trim() ? parseGrams(grams) : null;
    const intakeErrors = validatePuppyIntake({
      sex,
      collarColour: collar,
      tailType: tail,
      birthWeightGrams: parsed,
      birthTime: time,
      usedCollars,
      allowDuplicateCollar: allowDuplicate,
    });
    setFieldErrors(intakeErrors);
    if (!intakeIsComplete(intakeErrors) || !tail) return;
    const birthGrams = parsed as number;
    const heldPhotos = [...photos];
    setPending(true);
    try {
      const res = await addPuppyToLitter({
        litterId,
        birth_order: nextOrder,
        sex,
        tail_type: tail,
        collar_colour: collar,
        colour: colour || null,
        birth_weight_grams: birthGrams,
        birth_time: time || null,
        birth_type: birthType || null,
        allowDuplicateCollar: allowDuplicate,
        outcome,
      });
      if (res.error || !res.id) {
        setError(
          res.error ?? 'Could not save this pup. Values are still here — retry.',
        );
        return;
      }
      if (heldPhotos.length) {
        try {
          const urls = await resolvePhotoUrls(heldPhotos, `dogs/${res.id}`);
          if (urls[0]) {
            const photoRes = await addDogMedia({
              dogId: res.id,
              type: 'photo',
              url: urls[0],
              isPublic: false,
              uploadedBy: profile?.id ?? null,
            });
            if (photoRes.error) setPhotoNote('Pup saved. Photo can be added later.');
          } else {
            setPhotoNote('Pup saved. Photo can be added later.');
          }
        } catch {
          setPhotoNote('Pup saved. Photo can be added later.');
        }
      }
      setSavedLine(
        formatPuppySaved({
          order: nextOrder,
          collarLabel: collarLabel(collar ?? ''),
          sex,
          grams: birthGrams,
          time,
        }),
      );
      resetForm();
      await onSaved();
    } finally {
      setPending(false);
    }
  }

  async function finish() {
    setFinishing(true);
    setError(null);
    const res = await finishWhelping(litterId);
    setFinishing(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onFinished();
  }

  const progress = formatWhelpingProgress(
    pups.map((p) => ({
      outcome: p.outcome,
      status: p.status,
      deceased_at: p.deceased_at,
      birth_time: p.birth_time,
    })),
  );
  const label = letter ? `${letter}${nextOrder}` : `Pup #${nextOrder}`;

  return (
    <View>
      <View className="mb-4 rounded-xl border border-gold/30 bg-gold/10 p-4">
        <Typography variant="body">{progress}</Typography>
      </View>

      {pups.slice(-6).map((p) => (
        <View key={p.id} className="mb-1 flex-row justify-between">
          <Typography variant="caption">
            {p.sex === 'male' ? '♂' : p.sex === 'female' ? '♀' : '·'} {p.name}
            {p.collar_colour ? ` · ${collarLabel(p.collar_colour)}` : ''}
          </Typography>
          <Typography variant="caption">
            {formatBirthTime(p.birth_time) || '—'}
            {p.outcome && p.outcome !== 'live' ? ` · ${p.outcome}` : ''}
          </Typography>
        </View>
      ))}

      <Typography variant="display" className="mb-1 mt-4 text-gold">
        Pup #{nextOrder}
      </Typography>
      <Typography variant="caption" className="mb-4">
        {label}
      </Typography>

      <Typography variant="caption" className="mb-2 text-subtle">
        Outcome
      </Typography>
      <View className="mb-4 gap-2">
        {WHELPING_OUTCOME_BUTTONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setOutcome(o.value)}
            className={`min-h-14 items-center justify-center rounded-xl border ${
              outcome === o.value ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="subtitle">{o.label}</Typography>
          </Pressable>
        ))}
      </View>

      <View className="mb-4 flex-row items-end gap-2">
        <View className="flex-1">
          <Input
            label="Time"
            value={time}
            onChangeText={setTime}
            placeholder="02:14"
            containerClassName="mb-0"
          />
        </View>
        <Pressable
          onPress={() => setTime(nowTimeHm())}
          className="h-12 items-center justify-center rounded-xl border border-gold/30 px-4"
        >
          <Typography variant="caption">Now</Typography>
        </Pressable>
      </View>

      <Typography variant="caption" className="mb-2 text-subtle">
        Sex
      </Typography>
      <View className="mb-4 flex-row gap-2">
        {(['male', 'female'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSex(s)}
            className={`min-h-16 flex-1 items-center justify-center rounded-xl border ${
              sex === s ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="display">{s === 'male' ? '♂' : '♀'}</Typography>
          </Pressable>
        ))}
      </View>

      <Input
        ref={gramsRef}
        label="Weight (grams)"
        value={grams}
        onChangeText={(v) => setGrams(v.replace(/[^\d]/g, ''))}
        keyboardType="number-pad"
        placeholder="450"
      />

      <Typography variant="caption" className="mb-2 text-subtle">
        Collar
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {COLLAR_COLOURS.map((c) => {
          const used = usedCollars.includes(c.id) && collar !== c.id;
          const active = collar === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCollar(c.id)}
              className={`h-12 w-12 rounded-full border-2 ${
                active ? 'border-gold' : 'border-white/20'
              } ${used ? 'opacity-40' : ''}`}
              style={{ backgroundColor: c.hex }}
            />
          );
        })}
      </View>
      {fieldErrors.collar ? (
        <Typography variant="caption" className="mb-2 text-red-300">{fieldErrors.collar}</Typography>
      ) : null}
      {duplicateCollar ? (
        <Pressable onPress={() => setAllowDuplicate((v) => !v)} className="mb-3">
          <Typography variant="caption" className="text-amber-200">
            {allowDuplicate ? '✓ ' : ''}{fieldErrors.duplicate ?? 'That collar is already on another pup. Save anyway if you have run out.'}
          </Typography>
        </Pressable>
      ) : null}
      <Typography variant="caption" className="mb-2 text-subtle">
        Tail
      </Typography>
      <View className="mb-3 flex-row gap-2">
        {(['docked', 'natural'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setTail(value)}
            className={`min-h-14 flex-1 items-center justify-center rounded-xl border ${
              tail === value ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="caption">{value === 'docked' ? 'Docked' : 'Natural'}</Typography>
          </Pressable>
        ))}
      </View>
      {fieldErrors.tail ? (
        <Typography variant="caption" className="mb-2 text-red-300">{fieldErrors.tail}</Typography>
      ) : null}
      <Typography variant="caption" className="mb-2 text-subtle">
        Birth type (optional)
      </Typography>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {([
          ['natural', 'Natural'],
          ['assisted', 'Assisted'],
          ['c_section', 'Caesarean'],
        ] as const).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setBirthType(birthType === value ? '' : value)}
            className={`rounded-full border px-3 py-2 ${
              birthType === value ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="caption">{label}</Typography>
          </Pressable>
        ))}
      </View>

      <Typography variant="caption" className="mb-2 text-subtle">
        Colour
      </Typography>
      <View className="mb-4 gap-2">
        {DOG_COLOUR_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setColour(opt.value)}
            className={`min-h-14 items-center justify-center rounded-xl border ${
              colour === opt.value ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="subtitle">{opt.label}</Typography>
          </Pressable>
        ))}
      </View>

      <Typography variant="caption" className="mb-2 text-subtle">
        Photo (optional)
      </Typography>
      <View className="mb-4">
        <PhotoPicker value={photos} onChange={setPhotos} max={1} />
      </View>

      {fieldErrors.weight ? (
        <Typography variant="caption" className="mb-1 text-red-300">{fieldErrors.weight}</Typography>
      ) : null}
      {fieldErrors.time ? (
        <Typography variant="caption" className="mb-1 text-red-300">{fieldErrors.time}</Typography>
      ) : null}
      {fieldErrors.sex ? (
        <Typography variant="caption" className="mb-1 text-red-300">{fieldErrors.sex}</Typography>
      ) : null}
      {savedLine ? (
        <Typography variant="caption" className="mb-2 text-emerald-300">{savedLine}</Typography>
      ) : null}
      {error ? (
        <View className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3">
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        </View>
      ) : null}
      {photoNote ? (
        <Typography variant="caption" className="mb-3 text-amber-200">
          {photoNote}
        </Typography>
      ) : null}

      <Button
        label={pending ? 'Saving…' : `Save pup #${nextOrder}`}
        onPress={() => void save()}
        loading={pending}
        fullWidth
        size="lg"
        className="mb-3"
      />
      <Button
        label={finishing ? 'Closing…' : 'Finish whelping'}
        variant="secondary"
        onPress={() => void finish()}
        loading={finishing}
        disabled={pending || pups.length === 0}
        fullWidth
      />
    </View>
  );
}
