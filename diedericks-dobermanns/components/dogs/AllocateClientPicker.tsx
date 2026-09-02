import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import type { ClientOption } from '@/lib/dogs/unallocatedSales';
import { rowMatches } from '@/lib/search/match';

type Props = {
  clients: ClientOption[];
  selected: ClientOption | null;
  onSelect: (client: ClientOption | null) => void;
};

export function AllocateClientPicker({ clients, selected, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const hits = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return clients
      .filter((c) => rowMatches(q, { text: [c.full_name, c.email] }))
      .slice(0, 6);
  }, [clients, query]);

  if (selected) {
    return (
      <Pressable onPress={() => onSelect(null)}>
        <Typography variant="caption" className="text-gold">
          {selected.full_name || selected.email} · tap to change
        </Typography>
      </Pressable>
    );
  }

  return (
    <View>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search client name or email"
        containerClassName="mb-0"
      />
      {hits.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => {
            onSelect(c);
            setQuery('');
          }}
          className="mt-2 rounded-sm border border-gold/20 px-3 py-2"
        >
          <Typography variant="body">{c.full_name || 'Unnamed client'}</Typography>
          {c.email ? (
            <Typography variant="caption" className="text-subtle">
              {c.email}
            </Typography>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
