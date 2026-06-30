import { Pressable, View } from 'react-native';

import { lineChipBorder, lineShortLabel } from '@/components/breeding/LineBadge';
import { Typography } from '@/components/ui/Typography';
import type { BreedingDog } from '@/types/breeding';

interface LinedDogPickerProps {
  label: string;
  dogs: BreedingDog[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function groupByLine(dogs: BreedingDog[]) {
  const groups = { A: [] as BreedingDog[], B: [] as BreedingDog[], Cross: [] as BreedingDog[], Unassigned: [] as BreedingDog[] };
  for (const dog of dogs) {
    if (dog.line === 'A') groups.A.push(dog);
    else if (dog.line === 'B') groups.B.push(dog);
    else if (dog.line === 'Cross') groups.Cross.push(dog);
    else groups.Unassigned.push(dog);
  }
  return groups;
}

function DogChip({
  dog,
  selected,
  onSelect,
}: {
  dog: BreedingDog;
  selected: boolean;
  onSelect: () => void;
}) {
  const border = lineChipBorder(dog.line);
  const short = lineShortLabel(dog.line);

  return (
    <Pressable
      onPress={onSelect}
      className={`mb-2 mr-2 rounded-xl px-3 py-2 ${selected ? 'border-gold bg-gold/20' : 'bg-surface'}`}
      style={{ borderWidth: 1, borderColor: selected ? '#C4A35A' : border, borderLeftWidth: 4, borderLeftColor: border }}
    >
      <Typography variant="caption" className={selected ? 'text-gold' : 'text-ink'}>
        {dog.name}
        {selected && short ? ` · ${short}` : ''}
      </Typography>
    </Pressable>
  );
}

function LineSection({
  title,
  dogs,
  selectedId,
  onSelect,
}: {
  title: string;
  dogs: BreedingDog[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (dogs.length === 0) return null;
  return (
    <View className="mb-3">
      <Typography variant="caption" className="mb-1 text-gold">
        {title}
      </Typography>
      <View className="mb-1 h-px bg-gold/20" />
      <View className="flex-row flex-wrap">
        {dogs.map((dog) => (
          <DogChip
            key={dog.id}
            dog={dog}
            selected={selectedId === dog.id}
            onSelect={() => onSelect(dog.id)}
          />
        ))}
      </View>
    </View>
  );
}

export function LinedDogPicker({ label, dogs, selectedId, onSelect }: LinedDogPickerProps) {
  const groups = groupByLine(dogs);
  const hasAssigned = groups.A.length + groups.B.length + groups.Cross.length > 0;

  return (
    <View className="mb-4">
      <Typography variant="caption" className="mb-2 text-muted">
        {label}
      </Typography>
      {!hasAssigned ? (
        <View className="flex-row flex-wrap">
          {dogs.map((dog) => (
            <DogChip
              key={dog.id}
              dog={dog}
              selected={selectedId === dog.id}
              onSelect={() => onSelect(dog.id)}
            />
          ))}
        </View>
      ) : (
        <>
          <LineSection title="LINE A" dogs={groups.A} selectedId={selectedId} onSelect={onSelect} />
          <LineSection title="LINE B" dogs={groups.B} selectedId={selectedId} onSelect={onSelect} />
          <LineSection title="LINE CROSS" dogs={groups.Cross} selectedId={selectedId} onSelect={onSelect} />
          <LineSection title="UNASSIGNED" dogs={groups.Unassigned} selectedId={selectedId} onSelect={onSelect} />
        </>
      )}
    </View>
  );
}
