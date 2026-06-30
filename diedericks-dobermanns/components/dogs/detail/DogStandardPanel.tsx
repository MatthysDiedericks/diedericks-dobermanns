import { Pressable, View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Typography } from '@/components/ui/Typography';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { BREED_STANDARDS, type BloodlineType, type BreedStandard } from '@/lib/dogs/breedStandards';
import { requireSupabase } from '@/lib/supabase';
import type { Dog } from '@/types/app.types';

const STANDARDS: { value: BreedStandard; label: string }[] = [
  { value: 'fci_kusa', label: 'KUSA / FCI (European)' },
  { value: 'akc', label: 'AKC (American)' },
];

const BLOODLINES: { value: BloodlineType; label: string }[] = [
  { value: 'european', label: 'European' },
  { value: 'american', label: 'American' },
  { value: 'mixed', label: 'Mixed' },
];

interface DogStandardPanelProps {
  dog: Dog;
  canEdit: boolean;
  onSaved: () => void;
}

export function DogStandardPanel({ dog, canEdit, onSaved }: DogStandardPanelProps) {
  const standard = (dog.standard ?? 'fci_kusa') as BreedStandard;
  const bloodline = (dog.bloodline_type ?? 'european') as BloodlineType;
  const spec = BREED_STANDARDS[standard];

  async function saveStandard(value: BreedStandard) {
    if (!canEdit) return;
    try {
      const { error } = await requireSupabase().from('dogs').update({ standard: value }).eq('id', dog.id);
      if (error) throw new Error(error.message);
      showSaved();
      onSaved();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save.');
    }
  }

  async function saveBloodline(value: BloodlineType) {
    if (!canEdit) return;
    try {
      const { error } = await requireSupabase().from('dogs').update({ bloodline_type: value }).eq('id', dog.id);
      if (error) throw new Error(error.message);
      showSaved();
      onSaved();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save.');
    }
  }

  function ChipRow<T extends string>({
    label,
    options,
    value,
    onSelect,
  }: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onSelect: (value: T) => void;
  }) {
    return (
      <View className="mb-3">
        <Typography variant="caption" className="mb-2 text-silver">
          {label}
        </Typography>
        <View className="flex-row flex-wrap gap-2">
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <Pressable
                key={opt.value}
                disabled={!canEdit}
                onPress={() => onSelect(opt.value)}
                className={`rounded-xl border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
              >
                <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                  {active ? '● ' : '○ '}
                  {opt.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <SectionCard title="Breed standard & bloodline">
      <ChipRow label="Standard" options={STANDARDS} value={standard} onSelect={(v) => void saveStandard(v)} />
      <ChipRow label="Bloodline" options={BLOODLINES} value={bloodline} onSelect={(v) => void saveBloodline(v)} />
      <Typography variant="caption" className="italic text-subtle">
        {spec.bloodlineNote}
      </Typography>
    </SectionCard>
  );
}
