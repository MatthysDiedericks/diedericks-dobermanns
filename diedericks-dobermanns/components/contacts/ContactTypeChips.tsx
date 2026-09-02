import { Pressable, ScrollView } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { ContactType } from '@/types/phase10';

export type ContactTypeFilter = 'all' | ContactType;

const CHIPS: { id: ContactTypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'client', label: 'Client' },
  { id: 'prospect', label: 'Prospect' },
  { id: 'breeder', label: 'Breeder' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'judge', label: 'Judge' },
  { id: 'staff', label: 'Staff' },
  { id: 'other', label: 'Other' },
];

export function ContactTypeChips({
  value,
  onChange,
}: {
  value: ContactTypeFilter;
  onChange: (next: ContactTypeFilter) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
      {CHIPS.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => onChange(s.id)}
          className={`mr-2 rounded-full border px-4 py-2 ${
            value === s.id ? 'border-gold bg-gold/15' : 'border-gold/30'
          }`}
        >
          <Typography variant="label">{s.label}</Typography>
        </Pressable>
      ))}
    </ScrollView>
  );
}
