import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminApplications } from '@/hooks/useAdmin';
import { createWaitlistEntry, createWaitlistFromApplication, useSubmitting } from '@/hooks/useMutations';
import { useWaitlistTypes } from '@/hooks/useWaitingList';
import { categoryFromDogInterest, MANUAL_SOURCES, SOURCE_LABELS } from '@/lib/waitlist/helpers';
import type { Application } from '@/types/app.types';

export default function NewWaitlistEntryScreen() {
  const router = useRouter();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const { types } = useWaitlistTypes();
  const { data: applications } = useAdminApplications();
  const { submitting, run } = useSubmitting();
  const approved = useMemo(() => applications.filter((a) => a.status === 'approved'), [applications]);

  const [mode, setMode] = useState<'application' | 'manual'>(modeParam === 'manual' ? 'manual' : 'application');
  const [appQuery, setAppQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [listTypeId, setListTypeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [source, setSource] = useState<string>('other');
  const [preferredSex, setPreferredSex] = useState('any');
  const [preferredColour, setPreferredColour] = useState('');

  const appResults = approved.filter((a) => {
    const q = appQuery.trim().toLowerCase();
    if (!q) return true;
    return a.full_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  async function save() {
    if (!listTypeId) return;
    if (mode === 'application' && selectedApp) {
      const { error, id } = await run(() => createWaitlistFromApplication(selectedApp, listTypeId));
      if (!error && id) router.replace({ pathname: '/(admin)/waitlist/[id]', params: { id } });
      return;
    }
    const { error, id } = await run(() =>
      createWaitlistEntry({
        list_type_id: listTypeId,
        pipeline_stage: 'enquiry',
        enquirer_name: name.trim(),
        enquirer_email: email.trim(),
        enquirer_phone: phone.trim(),
        enquirer_country: country.trim(),
        preferred_sex: preferredSex,
        preferred_colour: preferredColour.trim() || null,
        preference_notes: notes.trim() || null,
        follow_up_date: followUp.trim() || null,
        source,
      }),
    );
    if (!error && id) router.replace({ pathname: '/(admin)/waitlist/[id]', params: { id } });
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Waiting List" title="Add Entry" />
      <ScrollView className="px-6 pb-12">
        <View className="mb-4 flex-row gap-2">
          <Button label="From Application" size="sm" variant={mode === 'application' ? 'primary' : 'outline'} onPress={() => setMode('application')} />
          <Button label="Manual" size="sm" variant={mode === 'manual' ? 'primary' : 'outline'} onPress={() => setMode('manual')} />
        </View>

        <Typography variant="label" className="mb-2 text-gold">List type</Typography>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {types.filter((t) => t.slug !== 'do-not-sell').map((t) => (
            <Button key={t.id} label={t.name} size="sm" variant={listTypeId === t.id ? 'primary' : 'outline'} onPress={() => setListTypeId(t.id)} />
          ))}
        </View>

        {mode === 'application' ? (
          <>
            <Input label="Search approved applications" value={appQuery} onChangeText={setAppQuery} />
            {appResults.map((a) => (
              <Card key={a.id} className={`mb-2 p-3 ${selectedApp?.id === a.id ? 'border-gold' : ''}`}>
                <Button
                  label={`${a.full_name} · ${a.email}`}
                  variant="outline"
                  onPress={() => {
                    setSelectedApp(a as Application);
                    setListTypeId(listTypeId || types[0]?.id || '');
                  }}
                />
                <Typography variant="caption" className="text-silver">
                  {categoryFromDogInterest((a as Application).dog_interest)} · {a.preferred_sex ?? 'any'}
                </Typography>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Input label="Full name" value={name} onChangeText={setName} />
            <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <Input label="Phone" value={phone} onChangeText={setPhone} />
            <Input label="Country" value={country} onChangeText={setCountry} />

            <Typography variant="label" className="mb-2 mt-1 text-gold">How did they find us?</Typography>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {MANUAL_SOURCES.map((s) => (
                <Button
                  key={s}
                  label={SOURCE_LABELS[s] ?? s}
                  size="sm"
                  variant={source === s ? 'primary' : 'outline'}
                  onPress={() => setSource(s)}
                />
              ))}
            </View>

            <Typography variant="label" className="mb-2 text-gold">Preferred sex</Typography>
            <View className="mb-4 flex-row gap-2">
              {['any', 'male', 'female'].map((s) => (
                <Button
                  key={s}
                  label={s}
                  size="sm"
                  variant={preferredSex === s ? 'primary' : 'outline'}
                  onPress={() => setPreferredSex(s)}
                />
              ))}
            </View>

            <Input label="Preferred colour (optional)" value={preferredColour} onChangeText={setPreferredColour} />
            <Input label="Notes" value={notes} onChangeText={setNotes} multiline className="h-20" />
            <Input label="Follow-up (YYYY-MM-DD)" value={followUp} onChangeText={setFollowUp} autoCapitalize="none" />
          </>
        )}

        <Button label="Save to waiting list" onPress={save} loading={submitting} disabled={!listTypeId} fullWidth className="mt-6" />
      </ScrollView>
    </ScreenContainer>
  );
}
