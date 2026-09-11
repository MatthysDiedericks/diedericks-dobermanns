import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminApplications } from '@/hooks/useAdmin';
import { useAuthStore } from '@/stores/authStore';
import { mergeDuplicateApplications } from '@/lib/applications/merge';
import {
  defaultMarketingOptIn,
  marketingOptInDisagrees,
  matchingDuplicates,
  mergeFieldRows,
  mostRecentApp,
} from '@/lib/applications/mergeDuplicates';
import { formatDateTime, titleCase } from '@/lib/format';

function referenceOf(id: string, code: string | null | undefined): string {
  return code ?? `DD-${id.slice(0, 8).toUpperCase()}`;
}

export default function MergeApplicationsScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const { data: applications, loading } = useAdminApplications();
  const profile = useAuthStore((s) => s.profile);
  const matches = useMemo(
    () => (email ? matchingDuplicates(applications, email) : []),
    [applications, email],
  );
  const newest = matches[0] ? mostRecentApp(matches) : null;
  const [keepId, setKeepId] = useState<string | null>(null);
  const survivorId = keepId ?? newest?.id ?? null;
  const [optIn, setOptIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const consentDiffers = marketingOptInDisagrees(matches);
  const chosenOptIn = optIn ?? (matches.length ? defaultMarketingOptIn(matches) : false);
  const rows = mergeFieldRows(matches);
  const differing = rows.filter((row) => row.differs);

  async function confirm() {
    if (!survivorId || !profile?.id) return;
    setBusy(true);
    const result = await mergeDuplicateApplications({
      survivorId,
      loserIds: matches.filter((app) => app.id !== survivorId).map((app) => app.id),
      marketingOptIn: consentDiffers ? chosenOptIn : undefined,
      actorId: profile.id,
      actorName: profile.full_name ?? 'admin',
    });
    setBusy(false);
    if (result.error || !result.survivorId) {
      Alert.alert('Could not merge', result.error ?? 'Merge did not complete.');
      return;
    }
    router.replace({
      pathname: '/(admin)/applications/[id]',
      params: { id: result.survivorId, kept: '1' },
    });
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Applications" title="Merge duplicates" />
      <View className="px-6 pb-8">
        {loading ? (
          <Typography variant="bodyMuted">Loading…</Typography>
        ) : matches.length < 2 ? (
          <Typography variant="bodyMuted">
            There are no longer two active applications to merge.
          </Typography>
        ) : (
          <>
            <Typography variant="bodyMuted" className="mb-4">
              Pick the record to keep. The others are archived, never deleted.
            </Typography>
            {consentDiffers ? (
              <Card className="mb-4 border border-amber-500/40 bg-amber-500/10">
                <Typography variant="subtitle" className="text-amber-400">
                  Marketing opt-in disagrees
                </Typography>
                <Typography variant="bodyMuted" className="mt-2">
                  The most recent answer is {defaultMarketingOptIn(matches) ? 'yes' : 'no'} — that
                  is the default.
                </Typography>
                <Pressable onPress={() => setOptIn(true)} className="mt-3">
                  <Typography variant="body" className={chosenOptIn ? 'text-gold' : ''}>
                    {chosenOptIn ? '●' : '○'} Keep yes
                  </Typography>
                </Pressable>
                <Pressable onPress={() => setOptIn(false)} className="mt-1">
                  <Typography variant="body" className={!chosenOptIn ? 'text-gold' : ''}>
                    {!chosenOptIn ? '●' : '○'} Keep no
                  </Typography>
                </Pressable>
              </Card>
            ) : null}
            {matches.map((app) => {
              const selected = survivorId === app.id;
              return (
                <Card key={app.id} className={selected ? 'mb-3 border border-gold' : 'mb-3'}>
                  <Typography variant="caption" className="text-gold">
                    {referenceOf(app.id, app.reference_code)}
                  </Typography>
                  <Typography variant="subtitle" className="mt-1">
                    {app.full_name}
                  </Typography>
                  <Typography variant="caption" className="mt-1 opacity-60">
                    {formatDateTime(app.created_at)}
                  </Typography>
                  <View className="mt-2">
                    <Badge label={titleCase(app.status)} tone="gold" />
                  </View>
                  <Button
                    label={selected ? 'Keeping this one' : 'Keep this one'}
                    variant={selected ? 'solid' : 'outline'}
                    onPress={() => setKeepId(app.id)}
                    className="mt-3"
                    fullWidth
                  />
                </Card>
              );
            })}
            <Card className="mb-4">
              <Typography variant="label" className="mb-2 text-gold">
                Differences
              </Typography>
              {differing.length === 0 ? (
                <Typography variant="bodyMuted">These applications match on every compared field.</Typography>
              ) : (
                differing.map((row) => (
                  <View key={row.field} className="border-b border-gold/10 py-2">
                    <Typography variant="caption">{row.label}</Typography>
                    {row.values.map((value, i) => (
                      <Typography key={`${row.field}-${matches[i]?.id ?? i}`} variant="body" className="mt-1 text-amber-300">
                        {referenceOf(matches[i].id, matches[i].reference_code)}: {value}
                      </Typography>
                    ))}
                  </View>
                ))
              )}
            </Card>
            <Button
              label={busy ? 'Merging…' : 'Archive the others and keep this one'}
              variant="solid"
              onPress={() => void confirm()}
              loading={busy}
              fullWidth
            />
            <Typography variant="caption" className="mt-3 opacity-60">
              The others stay in the database, archived, so old email links still work.
            </Typography>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}
