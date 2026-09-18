import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AccordionSection } from '@/components/dogs/detail/AccordionSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import {
  useDewormingForDog,
  useHealthProducts,
  useVetPractices,
} from '@/hooks/useHealth';
import { parseDateInput, showError } from '@/lib/dogDetail/feedback';
import { suggestNextDueDate } from '@/lib/health/nextDue';
import { suggestProductSpelling } from '@/lib/health/productMatch';

const today = () => new Date().toISOString().slice(0, 10);

const TYPES = [
  { value: 'deworming', label: 'Deworming' },
  { value: 'tick_flea', label: 'Ticks & fleas' },
  { value: 'both', label: 'Both' },
];

const SCHEDULES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'biannual', label: 'Every 6 months' },
  { value: 'custom', label: 'Custom' },
];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        active ? 'border-gold bg-gold/15' : 'border-gold/20'
      }`}
    >
      <Typography variant="caption">{label}</Typography>
    </Pressable>
  );
}

/** Record a worming / tick treatment for the dog currently on screen. */
export function DogDewormingForm({
  dogId,
  dogName,
}: {
  dogId: string;
  dogName: string;
}) {
  const dew = useDewormingForDog(dogId);
  const { products } = useHealthProducts();
  const { practices } = useVetPractices();
  const nextDueTouched = useRef(false);

  const [date, setDate] = useState(today);
  const [product, setProduct] = useState('');
  const [treatmentType, setTreatmentType] = useState('deworming');
  const [schedule, setSchedule] = useState('quarterly');
  const [nextDue, setNextDue] = useState(() => suggestNextDueDate(today(), 'quarterly'));
  const [dosage, setDosage] = useState('');
  const [givenBy, setGivenBy] = useState('');
  const [atPractice, setAtPractice] = useState(false);
  const [practiceId, setPracticeId] = useState('');
  const [doctor, setDoctor] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const productNames = useMemo(
    () =>
      products
        .filter((p) => p.is_active && (p.category === 'deworming' || p.category === 'tick_flea'))
        .map((p) => p.product_name),
    [products],
  );
  const spellingHint = suggestProductSpelling(product, productNames);
  const suggestions = productNames.filter((name) =>
    name.toLowerCase().includes(product.trim().toLowerCase()),
  );

  useEffect(() => {
    if (nextDueTouched.current) return;
    const suggested = suggestNextDueDate(date, schedule);
    if (suggested) setNextDue(suggested);
  }, [date, schedule]);

  function applyProduct(name: string) {
    setProduct(name);
    const match = products.find((p) => p.product_name.toLowerCase() === name.trim().toLowerCase());
    if (match?.default_schedule_type) {
      nextDueTouched.current = false;
      setSchedule(match.default_schedule_type);
      const suggested = suggestNextDueDate(date, match.default_schedule_type);
      if (suggested) setNextDue(suggested);
    }
  }

  async function onSave() {
    const given = parseDateInput(date);
    if (!product.trim() || !given) {
      showError('Product and date given are required.');
      return;
    }
    setSaving(true);
    try {
      const match = products.find(
        (p) => p.product_name.toLowerCase() === product.trim().toLowerCase(),
      );
      await dew.saveRecord({
        dog_id: dogId,
        product_name: product.trim(),
        date_treated: given,
        treatment_type: treatmentType,
        schedule_type: schedule,
        dosage: dosage.trim() || null,
        administered_by: givenBy.trim() || null,
        vet_practice_id: atPractice ? practiceId || null : null,
        doctor_name: atPractice ? doctor.trim() || null : null,
        health_product_id: match?.id ?? null,
        notes: notes.trim() || null,
        next_due_date: parseDateInput(nextDue) || suggestNextDueDate(given, schedule) || null,
      });
      setProduct('');
      setDosage('');
      setGivenBy('');
      setNotes('');
      setDoctor('');
      nextDueTouched.current = false;
      setNextDue(suggestNextDueDate(date, schedule));
    } catch (e) {
      showError(e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccordionSection title="Record a treatment" defaultOpen>
      <Typography variant="caption" className="mb-3 text-muted">
        {dogName} is already chosen. Next due drives the health calendar and owner reminders.
      </Typography>

      <Input label="Date given" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

      <Input
        label="Product"
        value={product}
        onChangeText={applyProduct}
        placeholder="Quantel, Bravecto…"
        autoCorrect={false}
      />
      {spellingHint ? (
        <Pressable onPress={() => applyProduct(spellingHint)} className="mb-3">
          <Typography variant="caption" className="text-amber-300">
            Did you mean {spellingHint}?
          </Typography>
        </Pressable>
      ) : null}
      {suggestions.length > 0 && product.trim() ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {suggestions.slice(0, 8).map((name) => (
            <Chip
              key={name}
              label={name}
              active={product.toLowerCase() === name.toLowerCase()}
              onPress={() => applyProduct(name)}
            />
          ))}
        </View>
      ) : null}

      <Typography variant="caption" className="mb-2 text-muted">
        Type
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            active={treatmentType === t.value}
            onPress={() => setTreatmentType(t.value)}
          />
        ))}
      </View>

      <Input label="Dose" value={dosage} onChangeText={setDosage} />

      <Typography variant="caption" className="mb-2 text-muted">
        Repeat
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {SCHEDULES.map((s) => (
          <Chip
            key={s.value}
            label={s.label}
            active={schedule === s.value}
            onPress={() => {
              nextDueTouched.current = false;
              setSchedule(s.value);
            }}
          />
        ))}
      </View>

      <Input
        label="Next due"
        value={nextDue}
        onChangeText={(v) => {
          nextDueTouched.current = true;
          setNextDue(v);
        }}
        placeholder="YYYY-MM-DD"
      />

      <Input label="Given by" value={givenBy} onChangeText={setGivenBy} />

      <Pressable onPress={() => setAtPractice((v) => !v)} className="mb-3">
        <Typography variant="caption" className={atPractice ? 'text-gold' : 'text-muted'}>
          {atPractice ? '✓ Given at a vet practice' : 'Given at a vet practice'}
        </Typography>
      </Pressable>
      {atPractice ? (
        <>
          <Typography variant="caption" className="mb-2 text-muted">
            Practice
          </Typography>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {practices.map((p) => (
              <Chip
                key={p.id}
                label={p.practice_name}
                active={practiceId === p.id}
                onPress={() => setPracticeId(p.id)}
              />
            ))}
          </View>
          <Input label="Vet" value={doctor} onChangeText={setDoctor} placeholder="Dr name" />
        </>
      ) : null}

      <Input label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Button label="Save record" onPress={() => void onSave()} loading={saving} fullWidth />
    </AccordionSection>
  );
}
