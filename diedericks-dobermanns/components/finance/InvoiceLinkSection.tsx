import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { NameSuggestion } from '@/lib/clients/clientRecord';
import { loadInvoiceLinkSuggestions, type DogSuggestion } from '@/lib/clients/loadSaleLinks';
import {
  linkInvoiceToContact,
  linkInvoiceToDog,
  searchContactsForLink,
  searchDogsForLink,
} from '@/lib/clients/saleLinkWrites';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type Choice = { id: string; label: string };

export function InvoiceLinkSection({
  invoiceId,
  dogId,
  dogName,
  contactId,
  invoiceName,
  onChanged,
}: {
  invoiceId: string;
  dogId: string | null;
  dogName: string | null;
  contactId: string | null;
  invoiceName: string | null;
  onChanged: () => void;
}) {
  const canWrite = useAuthStore((s) => s.hasRole('admin', 'super_admin'));
  const [dogSuggestions, setDogSuggestions] = useState<DogSuggestion[]>([]);
  const [contactSuggestions, setContactSuggestions] = useState<NameSuggestion[]>([]);
  const [contactName, setContactName] = useState<string | null>(null);
  const [dogChoice, setDogChoice] = useState<Choice | null>(null);
  const [contactChoice, setContactChoice] = useState<Choice | null>(null);
  const [dogConfirmed, setDogConfirmed] = useState(false);
  const [contactConfirmed, setContactConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadInvoiceLinkSuggestions(requireSupabase(), invoiceName)
      .then((suggestions) => {
        if (cancelled) return;
        setDogSuggestions(suggestions.dogs);
        setContactSuggestions(suggestions.contacts);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load suggestions');
      });
    if (contactId) {
      void requireSupabase()
        .from('contacts')
        .select('full_name')
        .eq('id', contactId)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setContactName(data?.full_name ?? null);
        });
    } else {
      setContactName(null);
    }
    return () => {
      cancelled = true;
    };
  }, [invoiceName, contactId]);

  const save = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      setDogConfirmed(false);
      setContactConfirmed(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the link');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4">
      <Typography variant="label" className="text-gold">
        LINKS
      </Typography>
      <Typography variant="caption" className="mt-1">
        A similar name is only a suggestion. Tick the confirmation before anything is saved. This does not set a
        portal login.
      </Typography>
      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}
      <Typography variant="body" className="mt-3">
        Dog: {dogName || 'none'}
      </Typography>
      {dogSuggestions.map((suggestion) => (
        <View key={suggestion.id} className="mt-2">
          <Typography variant="caption">
            {suggestion.leftLabel}: {suggestion.leftValue}
          </Typography>
          <Typography variant="caption">
            {suggestion.rightLabel}: {suggestion.rightValue}
          </Typography>
          <Typography variant="caption">Dog: {suggestion.dogName}</Typography>
          {canWrite ? (
            <Pressable
              onPress={() => {
                setDogChoice({ id: suggestion.id, label: suggestion.dogName });
                setDogConfirmed(false);
              }}
            >
              <Typography variant="label" className="text-gold">
                Use this suggestion
              </Typography>
            </Pressable>
          ) : null}
        </View>
      ))}
      {canWrite ? (
        <LinkSearch
          placeholder="Search dogs"
          selected={dogChoice?.label ?? null}
          confirmed={dogConfirmed}
          confirmLabel="I am confirming this dog link. It is not an automatic name match."
          onSearch={async (query) => {
            const hits = await searchDogsForLink(query);
            return hits.map((hit) => ({ id: hit.id, label: hit.name }));
          }}
          onPick={(choice) => {
            setDogChoice(choice);
            setDogConfirmed(false);
          }}
          onConfirmChange={setDogConfirmed}
          busy={busy}
          actionLabel="Confirm dog link"
          actionDisabled={!dogChoice || !dogConfirmed}
          onAction={() =>
            void save(() =>
              linkInvoiceToDog({ invoiceId, dogId: dogChoice?.id ?? null, confirmed: dogConfirmed }),
            )
          }
          secondaryLabel={dogId ? 'Remove dog link' : null}
          onSecondary={() => void save(() => linkInvoiceToDog({ invoiceId, dogId: null, confirmed: dogConfirmed }))}
        />
      ) : null}

      <Typography variant="body" className="mt-4">
        Contact: {contactName || 'none'}
      </Typography>
      {contactSuggestions.map((suggestion) => (
        <View key={suggestion.id} className="mt-2">
          <Typography variant="caption">
            {suggestion.leftLabel}: {suggestion.leftValue}
          </Typography>
          <Typography variant="caption">
            {suggestion.rightLabel}: {suggestion.rightValue}
          </Typography>
          {canWrite ? (
            <Pressable
              onPress={() => {
                setContactChoice({ id: suggestion.id, label: suggestion.leftValue });
                setContactConfirmed(false);
              }}
            >
              <Typography variant="label" className="text-gold">
                Use this suggestion
              </Typography>
            </Pressable>
          ) : null}
        </View>
      ))}
      {canWrite ? (
        <LinkSearch
          placeholder="Search existing contacts"
          selected={contactChoice?.label ?? null}
          confirmed={contactConfirmed}
          confirmLabel="I am confirming this contact link. It does not change who owns the dog."
          onSearch={async (query) => searchContactsForLink(query).then((hits) => hits.map((hit) => ({ id: hit.id, label: hit.fullName })))}
          onPick={(choice) => {
            setContactChoice(choice);
            setContactConfirmed(false);
          }}
          onConfirmChange={setContactConfirmed}
          busy={busy}
          actionLabel="Confirm contact link"
          actionDisabled={!contactChoice || !contactConfirmed}
          onAction={() =>
            void save(() =>
              linkInvoiceToContact({
                invoiceId,
                contactId: contactChoice?.id ?? null,
                confirmed: contactConfirmed,
              }),
            )
          }
          secondaryLabel={contactId ? 'Remove contact link' : null}
          onSecondary={() =>
            void save(() => linkInvoiceToContact({ invoiceId, contactId: null, confirmed: contactConfirmed }))
          }
        />
      ) : null}
    </Card>
  );
}

function LinkSearch({
  placeholder,
  selected,
  confirmed,
  confirmLabel,
  onSearch,
  onPick,
  onConfirmChange,
  busy,
  actionLabel,
  actionDisabled,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  placeholder: string;
  selected: string | null;
  confirmed: boolean;
  confirmLabel: string;
  onSearch: (query: string) => Promise<Choice[]>;
  onPick: (choice: Choice) => void;
  onConfirmChange: (value: boolean) => void;
  busy: boolean;
  actionLabel: string;
  actionDisabled: boolean;
  onAction: () => void;
  secondaryLabel: string | null;
  onSecondary: () => void;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Choice[]>([]);
  return (
    <View className="mt-2">
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor="#8a8478"
        className="rounded-sm border border-gold/30 px-3 py-2 text-white"
        onSubmitEditing={() => {
          void onSearch(query).then(setHits).catch(() => setHits([]));
        }}
      />
      {hits.map((hit) => (
        <Pressable key={hit.id} onPress={() => onPick(hit)} className="py-1">
          <Typography variant="body">{hit.label}</Typography>
        </Pressable>
      ))}
      {selected ? <Typography variant="caption">Selected: {selected}</Typography> : null}
      <Pressable onPress={() => onConfirmChange(!confirmed)} className="mt-2">
        <Typography variant="caption" className={confirmed ? 'text-gold' : ''}>
          {confirmed ? '☑ ' : '☐ '}
          {confirmLabel}
        </Typography>
      </Pressable>
      <Button label={busy ? 'Saving…' : actionLabel} onPress={onAction} disabled={busy || actionDisabled} className="mt-2" />
      {secondaryLabel ? (
        <Button label={secondaryLabel} variant="outline" onPress={onSecondary} disabled={busy || !confirmed} className="mt-2" />
      ) : null}
    </View>
  );
}
