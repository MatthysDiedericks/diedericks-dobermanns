import { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';

import { PricingTierEditor } from '@/components/admin/PricingTierEditor';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { usePricing } from '@/hooks/usePricing';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import type { PricingTier } from '@/lib/finance/pricingQueries';

export default function AdminPricingScreen() {
  const { tiers, loading, error, save } = usePricing();
  const [editing, setEditing] = useState<PricingTier | null>(null);

  async function togglePublic(tier: PricingTier, isPublic: boolean) {
    const { error: err } = await save(tier.id, {
      price: tier.price,
      display_label: tier.display_label,
      description: tier.description,
      is_public: isPublic,
    });
    if (err) Alert.alert('Could not update', err);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Admin" title="Pricing" />
      <View className="gap-3 px-6 pb-12">
        <Typography variant="bodyMuted">
          One flat price per tier — used to auto-price quotes and shown to applicants on the
          website. Handle exceptions by editing the individual quote.
        </Typography>

        {error ? (
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        ) : null}

        {loading ? (
          <CardListSkeleton count={3} />
        ) : tiers.length === 0 ? (
          <EmptyState
            title="No pricing tiers"
            message="Pricing tiers are seeded by migration — contact support if this list is empty."
          />
        ) : (
          tiers.map((tier) => (
            <Card key={tier.id} className="p-4">
              <View className="flex-row items-start justify-between">
                <Pressable className="flex-1 pr-3" onPress={() => setEditing(tier)}>
                  <Typography variant="subtitle" className="text-gold">
                    {tier.display_label}
                  </Typography>
                  {tier.description ? (
                    <Typography variant="bodyMuted" className="mt-1">
                      {tier.description}
                    </Typography>
                  ) : null}
                  <Typography variant="display" className="mt-3 text-gold">
                    {formatAmount(tier.price)}
                  </Typography>
                  <Typography variant="caption" className="mt-2 text-subtle">
                    Last updated {formatDate(tier.updated_at)}
                  </Typography>
                </Pressable>
                <View className="items-center gap-1">
                  <Switch value={tier.is_public} onValueChange={(v) => void togglePublic(tier, v)} />
                  <Typography variant="caption" className="text-subtle">
                    {tier.is_public ? 'Public' : 'Hidden'}
                  </Typography>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>

      <PricingTierEditor tier={editing} onClose={() => setEditing(null)} onSave={save} />
    </ScreenContainer>
  );
}
