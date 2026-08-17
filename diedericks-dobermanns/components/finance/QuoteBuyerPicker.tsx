import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  buyerKey,
  filterBuyerOptions,
  parseBuyerKey,
  type QuoteBuyerOption,
} from '@/lib/finance/quoteBuyerOptions';

export function QuoteBuyerPicker({
  options,
  selectedKey,
  onSelect,
  walkinName,
  onWalkinChange,
}: {
  options: QuoteBuyerOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  walkinName: string;
  onWalkinChange: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = filterBuyerOptions(options, query);
  const selected = parseBuyerKey(selectedKey);
  const shown = query ? filtered : options.slice(0, 12);

  return (
    <View className="gap-2">
      <Typography variant="caption">Client</Typography>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search name or email…"
        placeholderTextColor={Colors.silver}
        className="rounded-xl border border-gold/20 bg-surface px-3 py-2 text-cream"
      />
      <View className="gap-1">
        {shown.map((o) => {
          const active = selectedKey === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => onSelect(o.key)}
              className={`rounded-xl border px-3 py-2 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
              }`}
            >
              <Typography variant="body">{o.label}</Typography>
              {o.hint ? (
                <Typography variant="caption" className="text-ink-muted">
                  {o.hint}
                </Typography>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onSelect(buyerKey('walkin'))}
          className={`rounded-xl border px-3 py-2 ${
            selected.kind === 'walkin' ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
          }`}
        >
          <Typography variant="body">Not in the list — type a name</Typography>
        </Pressable>
      </View>
      {selected.kind === 'walkin' ? (
        <Input
          placeholder="Buyer name (historical / not in the list)"
          value={walkinName}
          onChangeText={onWalkinChange}
        />
      ) : null}
    </View>
  );
}
