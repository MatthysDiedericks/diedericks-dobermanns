import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { logTierChange, updateVideoFields, useVideoBundles } from '@/hooks/useTrainingVideos';
import { ACCESS_TIERS, TIER_LABEL, normalizeTier, type AccessTier } from '@/lib/training/access';

const REVOKE =
  'Buyers who could watch this yesterday will lose it immediately. Continue?';

export function TrainingVideoTierChips({
  videoId,
  accessTier,
  bundleId,
  counts,
}: {
  videoId: string;
  accessTier: string;
  bundleId: string | null;
  counts: Record<AccessTier, { videos: number; viewers: number }>;
}) {
  const current = normalizeTier(accessTier);
  const { bundles } = useVideoBundles();
  const [busy, setBusy] = useState(false);

  async function choose(tier: AccessTier) {
    if (busy) return;
    if (current === 'owner' && tier === 'paid') {
      Alert.alert('Revoke puppy access?', REVOKE, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => void apply(tier, true) },
      ]);
      return;
    }
    await apply(tier, false);
  }

  async function apply(tier: AccessTier, confirmed: boolean) {
    if (current === 'owner' && tier === 'paid' && !confirmed) return;
    setBusy(true);
    try {
      await updateVideoFields(videoId, {
        access_tier: tier,
        bundle_id: tier === 'paid' ? bundleId ?? bundles[0]?.id ?? null : null,
      });
      await logTierChange([videoId], current, tier);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update access');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {ACCESS_TIERS.map((tier) => {
        const count = counts[tier];
        const label =
          tier === 'public'
            ? `${TIER_LABEL[tier]} — ${count.videos}`
            : `${TIER_LABEL[tier]} — ${count.videos} videos, seen by ${count.viewers} clients`;
        return (
          <Pressable
            key={tier}
            disabled={busy}
            onPress={() => void choose(tier)}
            className={`min-h-[44px] rounded-lg border px-3 py-2 ${
              current === tier ? 'border-gold bg-gold/10' : 'border-surface-border'
            }`}
          >
            <Typography variant="caption">{label}</Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
