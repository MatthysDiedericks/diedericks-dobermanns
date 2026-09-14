import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  applyAgreedTierChange,
  dogMismatchForTier,
  loadChangeTierContext,
  staleQuotesForTier,
  type ChangeTierContext,
  type ChangeTierResult,
} from '@/lib/applications/changeTier';
import {
  formatRandWhole,
  priceChangeSentence,
  tierPriceLabel,
} from '@/lib/applications/tierVocab';
import { useAuthStore } from '@/stores/authStore';

export default function ChangeTierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [ctx, setCtx] = useState<ChangeTierContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierKey, setTierKey] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ChangeTierResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    void loadChangeTierContext(id).then((res) => {
      setLoading(false);
      if (res.error || !res.context) {
        setError(res.error ?? 'Application not found.');
        return;
      }
      setCtx(res.context);
      setTierKey(res.context.currentTierKey ?? '');
    });
  }, [id]);

  const selected = ctx?.publicTiers.find((t) => t.tier_key === tierKey) ?? null;
  const fromTier = ctx?.currentTierKey
    ? ctx.allTiers.find((t) => t.tier_key === ctx.currentTierKey) ?? null
    : null;
  const sentence = selected ? priceChangeSentence(fromTier, selected) : '';
  const stale = useMemo(
    () => (ctx ? staleQuotesForTier(ctx.staleQuotes, tierKey || null) : []),
    [ctx, tierKey],
  );
  const dogs = useMemo(
    () => (ctx ? dogMismatchForTier(ctx.allocatedDogs, tierKey || null, ctx.allTiers) : []),
    [ctx, tierKey],
  );

  async function save() {
    if (!id || !profile?.id) return;
    setBusy(true);
    const res = await applyAgreedTierChange({
      applicationId: id,
      newTierKey: tierKey,
      reason,
      actorId: profile.id,
    });
    setBusy(false);
    if (res.error || !res.result) {
      Alert.alert('Could not save', res.error ?? 'The tier was not changed.');
      return;
    }
    setResult(res.result);
  }

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (error || !ctx) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Application" title="Change tier" />
        <View className="px-6">
          <Typography variant="bodyMuted">{error ?? 'Application not found.'}</Typography>
          <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
        </View>
      </ScreenContainer>
    );
  }

  if (result) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Application" title="Tier updated" />
        <View className="px-6 pb-8">
          <Card className="mb-4">
            <Typography variant="body">
              Agreed tier is now {selected?.display_label ?? result.agreedTier}. Their original
              answer was not touched.
            </Typography>
            <Typography variant="caption" className="mt-3">
              budget_range before: {result.budgetRangeBefore ?? '—'}
            </Typography>
            <Typography variant="caption">
              budget_range after: {result.budgetRangeAfter ?? '—'}
            </Typography>
          </Card>
          {stale.map((q) => (
            <Card key={q.id} className="mb-4 border border-amber-500/40 bg-amber-500/10">
              <Typography variant="body">
                This quote was issued at the {q.inferredLabel} price and no longer matches the
                agreed tier{q.quoteNumber ? ` (${q.quoteNumber})` : ''}.
              </Typography>
              <Button
                label="Create a revision"
                variant="outline"
                className="mt-3"
                onPress={() =>
                  router.push(`/(admin)/quotes/${q.id}/edit` as Href)
                }
              />
            </Card>
          ))}
          <Card>
            <Typography variant="label" className="text-gold">
              Draft email — send it yourself
            </Typography>
            <Typography variant="caption" className="mt-1">
              Nothing has been emailed. Copy this and send it from your own inbox.
            </Typography>
            <Typography variant="body" className="mt-3">
              {result.draftSubject}
            </Typography>
            <Typography variant="bodyMuted" className="mt-3">
              {result.draftBody}
            </Typography>
            <Button
              label={copied ? 'Shared' : 'Share draft'}
              variant="outline"
              className="mt-4"
              onPress={() => {
                void Share.share({
                  message: `${result.draftSubject}\n\n${result.draftBody}`,
                }).then(() => setCopied(true));
              }}
            />
          </Card>
          <Button
            label="Back to application"
            className="mt-6"
            fullWidth
            onPress={() =>
              router.replace({ pathname: '/(admin)/applications/[id]', params: { id } })
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Application" title="Change tier" />
      <View className="px-6 pb-2">
        <Typography variant="bodyMuted">
          The applicant&apos;s original answer stays on the form.
        </Typography>
      </View>
      <View className="px-6 pb-8">
        <Card>
          <Typography variant="caption">Applied for</Typography>
          <Typography variant="body" className="mt-1">
            Applied for: {ctx.appliedForLabel}
          </Typography>
        </Card>

        <Card className="mt-4">
          <Typography variant="label" className="mb-2 text-gold">
            New tier
          </Typography>
          {ctx.publicTiers.map((t) => (
            <Pressable
              key={t.tier_key}
              onPress={() => setTierKey(t.tier_key)}
              className={`mb-2 rounded-sm border px-3 py-3 ${
                tierKey === t.tier_key ? 'border-gold bg-gold/10' : 'border-gold/20'
              }`}
            >
              <Typography variant="body">
                {t.display_label} — {tierPriceLabel(t)}
              </Typography>
            </Pressable>
          ))}
        </Card>

        <Input
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="Client called, wants the development programme."
          className="mt-4"
        />
        <Typography variant="caption" className="mt-1">
          One line. Six months from now this is what explains the price on the invoice.
        </Typography>

        {sentence ? (
          <Card className="mt-4 border border-gold/30 bg-gold/5">
            <Typography variant="body">{sentence}</Typography>
          </Card>
        ) : null}

        {ctx.deposit ? (
          <Card className="mt-4 border border-amber-500/40 bg-amber-500/10">
            <Typography variant="body">
              A deposit of {formatRandWhole(ctx.deposit.amount)} has already been received against
              the {ctx.deposit.againstLabel} tier. Invoices and payments are not changed.
            </Typography>
          </Card>
        ) : null}

        {dogs.map((d) => (
          <Card key={d.name} className="mt-4 border border-amber-500/40 bg-amber-500/10">
            <Typography variant="body">
              {d.name} is allocated and tagged {d.programmeLabel}. The dog is not changed — the
              application is what moved.
            </Typography>
          </Card>
        ))}

        {stale.map((q) => (
          <Card key={q.id} className="mt-4 border border-amber-500/40 bg-amber-500/10">
            <Typography variant="body">
              This quote was issued at the {q.inferredLabel} price and no longer matches the agreed
              tier{q.quoteNumber ? ` (${q.quoteNumber})` : ''}.
            </Typography>
            <Button
              label="Create a revision"
              variant="outline"
              className="mt-3"
              onPress={() =>
                router.push(`/(admin)/quotes/${q.id}/edit` as Href)
              }
            />
          </Card>
        ))}

        {ctx.waitlistCount ? (
          <Typography variant="caption" className="mt-3">
            Their waiting-list {ctx.waitlistCount === 1 ? 'entry' : 'entries'} will be updated to
            the new tier. Position stays put.
          </Typography>
        ) : null}

        <Button
          label="Save agreed tier"
          className="mt-6"
          fullWidth
          loading={busy}
          disabled={!tierKey || reason.trim().length < 3}
          onPress={() => void save()}
        />
        <Button
          label="Cancel"
          variant="outline"
          className="mt-3"
          fullWidth
          onPress={() => router.back()}
        />
      </View>
    </ScreenContainer>
  );
}
