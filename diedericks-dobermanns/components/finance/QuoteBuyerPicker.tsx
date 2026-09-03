import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  lookupQuoteContactHint,
  searchContactsForQuote,
  type QuoteContactHint,
} from '@/lib/finance/findOrCreateQuoteContact';
import {
  buyerKey,
  filterBuyerOptions,
  parseBuyerKey,
  type QuoteBuyerOption,
} from '@/lib/finance/quoteBuyerOptions';

function hintCopy(hint: QuoteContactHint): string {
  return hint === 'portal'
    ? 'Existing client — this will appear in her portal'
    : 'New contact — she has no portal account yet';
}

export function QuoteBuyerPicker({
  options,
  selectedKey,
  onSelect,
  walkinName,
  onWalkinChange,
  walkinEmail,
  onWalkinEmailChange,
  walkinPhone,
  onWalkinPhoneChange,
}: {
  options: QuoteBuyerOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  walkinName: string;
  onWalkinChange: (name: string) => void;
  walkinEmail: string;
  onWalkinEmailChange: (email: string) => void;
  walkinPhone: string;
  onWalkinPhoneChange: (phone: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [hint, setHint] = useState<QuoteContactHint | null>(null);
  const [matches, setMatches] = useState<
    { id: string; full_name: string; email: string | null; phone: string | null }[]
  >([]);
  const filtered = filterBuyerOptions(options, query);
  const selected = parseBuyerKey(selectedKey);
  const shown = query ? filtered : options.slice(0, 12);

  useEffect(() => {
    if (selected.kind !== 'walkin') {
      setHint(null);
      setMatches([]);
      return;
    }
    const q = walkinEmail.trim() || walkinName.trim();
    if (q.length < 2) {
      setHint(null);
      setMatches([]);
      return;
    }
    const t = setTimeout(() => {
      void searchContactsForQuote(q).then(setMatches).catch(() => setMatches([]));
      if (walkinEmail.includes('@')) {
        void lookupQuoteContactHint(walkinEmail)
          .then(setHint)
          .catch(() => setHint('new'));
      } else {
        setHint(null);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [selected.kind, walkinEmail, walkinName]);

  return (
    <View className="gap-2">
      <Typography variant="caption">Client</Typography>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search name or email…"
        placeholderTextColor={Colors.silver}
        className="rounded-xl border border-gold/20 bg-surface px-3 py-2 text-cream"
        autoCapitalize="none"
        keyboardType="email-address"
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
          <Typography variant="body">Not in the list — add name and email</Typography>
        </Pressable>
      </View>
      {selected.kind === 'walkin' ? (
        <View className="gap-2">
          <Input placeholder="Full name" value={walkinName} onChangeText={onWalkinChange} />
          <Input
            placeholder="Email (needed to send)"
            value={walkinEmail}
            onChangeText={onWalkinEmailChange}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input placeholder="Phone (optional)" value={walkinPhone} onChangeText={onWalkinPhoneChange} />
          {matches.length > 0 ? (
            <View className="gap-1">
              {matches.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    onSelect(buyerKey('contact', m.id));
                    onWalkinChange(m.full_name);
                    onWalkinEmailChange(m.email ?? '');
                    onWalkinPhoneChange(m.phone ?? '');
                  }}
                  className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2"
                >
                  <Typography variant="body">{m.full_name}</Typography>
                  <Typography variant="caption" className="text-ink-muted">
                    {m.email ?? 'no email'}
                  </Typography>
                </Pressable>
              ))}
            </View>
          ) : null}
          {hint ? (
            <Typography variant="caption" className="text-gold">
              {hintCopy(hint)}
            </Typography>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
