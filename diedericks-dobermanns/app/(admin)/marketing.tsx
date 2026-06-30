import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminApplications, useClients, useEnquiries } from '@/hooks/useAdmin';
import { setMarketingOptIn } from '@/hooks/useMutations';

type Source = 'Client' | 'Applicant' | 'Enquiry';

interface Contact {
  key: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  location: string;
  source: Source;
  optIn: boolean;
}

const SOURCE_TONE: Record<Source, BadgeTone> = {
  Client: 'gold',
  Applicant: 'neutral',
  Enquiry: 'muted',
};

export default function MarketingScreen() {
  const { data: clients } = useClients();
  const { data: applications } = useAdminApplications();
  const { data: enquiries } = useEnquiries();

  const [optedOnly, setOptedOnly] = useState(false);
  const [showEmails, setShowEmails] = useState(false);
  // Optimistic opt-in overrides keyed by user id (so demo mode reflects taps).
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const contacts = useMemo<Contact[]>(() => {
    const byKey = new Map<string, Contact>();
    const add = (c: Contact) => {
      const existing = byKey.get(c.key);
      // Prefer richer Client records over prospect rows on collision.
      if (!existing || (existing.source !== 'Client' && c.source === 'Client')) {
        byKey.set(c.key, c);
      } else if (existing && !existing.email && c.email) {
        byKey.set(c.key, { ...existing, email: c.email });
      }
    };

    clients.forEach((u) =>
      add({
        key: (u.full_name ?? u.id).toLowerCase(),
        userId: u.id,
        name: u.full_name ?? 'Unnamed',
        email: null,
        phone: u.phone,
        location: [u.city, u.country].filter(Boolean).join(', '),
        source: 'Client',
        optIn: overrides[u.id] ?? u.marketing_opt_in,
      }),
    );
    applications.forEach((a) =>
      add({
        key: (a.email || a.full_name).toLowerCase(),
        userId: null,
        name: a.full_name,
        email: a.email,
        phone: a.phone,
        location: [a.city, a.country].filter(Boolean).join(', '),
        source: 'Applicant',
        optIn: true,
      }),
    );
    enquiries.forEach((e) =>
      add({
        key: (e.email || e.full_name).toLowerCase(),
        userId: null,
        name: e.full_name,
        email: e.email,
        phone: e.phone,
        location: e.country ?? '',
        source: 'Enquiry',
        optIn: true,
      }),
    );
    return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, applications, enquiries, overrides]);

  const visible = optedOnly ? contacts.filter((c) => c.optIn) : contacts;
  const optedInCount = contacts.filter((c) => c.optIn).length;
  const emailList = contacts
    .filter((c) => c.optIn && c.email)
    .map((c) => c.email)
    .join(', ');

  async function toggleOptIn(userId: string, current: boolean) {
    setOverrides((prev) => ({ ...prev, [userId]: !current }));
    await setMarketingOptIn(userId, !current);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Growth" title="Marketing Database" />

      <View className="px-6">
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Typography variant="displayLg" className="text-gold">
              {contacts.length}
            </Typography>
            <Typography variant="caption" className="mt-1">
              Total contacts
            </Typography>
          </Card>
          <Card className="flex-1">
            <Typography variant="displayLg" className="text-gold">
              {optedInCount}
            </Typography>
            <Typography variant="caption" className="mt-1">
              Opted in
            </Typography>
          </Card>
        </View>

        <View className="mt-4 flex-row gap-2">
          <Pressable
            onPress={() => setOptedOnly((v) => !v)}
            className={`rounded-full border px-4 py-2 ${
              optedOnly ? 'border-gold bg-gold/15' : 'border-gold/20 bg-black-rich'
            }`}
          >
            <Typography variant="caption" className={optedOnly ? 'text-gold' : 'text-silver'}>
              Opted-in only
            </Typography>
          </Pressable>
          <Pressable
            onPress={() => setShowEmails((v) => !v)}
            className="rounded-full border border-gold/20 bg-black-rich px-4 py-2"
          >
            <Typography variant="caption" className="text-silver">
              {showEmails ? 'Hide emails' : 'Export emails'}
            </Typography>
          </Pressable>
        </View>

        {showEmails ? (
          <Card className="mt-4">
            <Typography variant="label" className="mb-2">
              Opted-in email list ({contacts.filter((c) => c.optIn && c.email).length})
            </Typography>
            <Typography variant="bodyMuted" selectable>
              {emailList || 'No email addresses on record yet.'}
            </Typography>
          </Card>
        ) : null}
      </View>

      <View className="mt-6 gap-3 px-6">
        {visible.length === 0 ? (
          <EmptyState title="No contacts yet" message="Clients, applicants and enquiries appear here." />
        ) : (
          visible.map((c) => (
            <Card key={c.key} className="flex-row items-center">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Typography variant="subtitle" numberOfLines={1} className="flex-1">
                    {c.name}
                  </Typography>
                  <Badge label={c.source} tone={SOURCE_TONE[c.source]} />
                </View>
                <Typography variant="caption" className="mt-0.5" numberOfLines={1}>
                  {[c.email, c.phone].filter(Boolean).join('  ·  ') || 'No contact details'}
                </Typography>
                {c.location ? (
                  <Typography variant="caption" className="mt-0.5 text-silver">
                    {c.location}
                  </Typography>
                ) : null}
              </View>
              {c.userId ? (
                <Pressable onPress={() => toggleOptIn(c.userId as string, c.optIn)} className="ml-3">
                  <View className={`h-6 w-11 rounded-full p-0.5 ${c.optIn ? 'bg-gold' : 'bg-black-rich'}`}>
                    <View className={`h-5 w-5 rounded-full bg-ink ${c.optIn ? 'ml-auto' : ''}`} />
                  </View>
                </Pressable>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
