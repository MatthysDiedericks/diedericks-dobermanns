import { Alert, Pressable, View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { Typography } from '@/components/ui/Typography';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import type { Dog } from '@/types/app.types';

const FEMALE_OPTIONS = [
  { label: 'Breeding Female', value: 'keep', icon: '♀' },
  { label: 'Alumni / Placed', value: 'sold', icon: '🎓' },
  { label: 'In Memory', value: 'deceased', icon: '🕊' },
] as const;

const MALE_OPTIONS = [
  { label: 'Stud', value: 'stud', icon: '♂' },
  { label: 'Alumni / Placed', value: 'sold', icon: '🎓' },
  { label: 'In Memory', value: 'deceased', icon: '🕊' },
] as const;

function isActiveStatus(current: string | null, value: string): boolean {
  if (value === 'keep') return current === 'keep' || current === 'breeding_stock';
  if (value === 'sold') {
    return current === 'sold' || current === 'retired' || current === 'donated' || current === 'gifted';
  }
  return current === value;
}

interface DogStatusPanelProps {
  dog: Dog;
  onStatusChanged: () => void;
}

export function DogStatusPanel({ dog, onStatusChanged }: DogStatusPanelProps) {
  const options = dog.sex === 'male' ? MALE_OPTIONS : FEMALE_OPTIONS;

  async function doUpdate(value: string, label: string) {
    try {
      const { error } = await requireSupabase()
        .from('dogs')
        .update({ status: value })
        .eq('id', dog.id);
      if (error) throw new Error(error.message);
      showSaved(`${dog.name} moved to ${label} ✓`);
      onStatusChanged();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not update status.');
    }
  }

  function confirmChange(value: string, label: string) {
    if (isActiveStatus(dog.status, value)) return;

    if (value === 'deceased') {
      Alert.alert(
        'Mark as Deceased?',
        `This will move ${dog.name} to the In Memory section. This cannot be undone easily.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', style: 'destructive', onPress: () => void doUpdate(value, label) },
        ],
      );
      return;
    }

    Alert.alert('Change status?', `Move ${dog.name} to ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => void doUpdate(value, label) },
    ]);
  }

  return (
    <SectionCard title="Kennel status">
      <View className="mb-3 flex-row flex-wrap items-center gap-2">
        <Typography variant="caption" className="text-subtle">
          Current:
        </Typography>
        <DogStatusBadge status={dog.status} />
      </View>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const active = isActiveStatus(dog.status, opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => confirmChange(opt.value, opt.label)}
              className={`rounded-xl border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {opt.icon} {opt.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      {dog.sex === 'female' ? (
        <Typography variant="caption" className="text-subtle">
          🤰 Expecting — appears automatically when a mating date is recorded in the Heat Cycles tab.
        </Typography>
      ) : null}
    </SectionCard>
  );
}
