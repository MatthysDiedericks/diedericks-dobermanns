import { ActivityIndicator, View } from 'react-native';

import { PreferenceBadges } from '@/components/waitlist/PreferenceBadges';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { usePortalWaitlistEntry } from '@/hooks/usePortal';
import { PIPELINE_STAGES, stageLabel } from '@/lib/waitlist/constants';
import { effectiveStage } from '@/lib/waitlist/helpers';

export default function PortalWaitlistScreen() {
  const { entry, loading, error } = usePortalWaitlistEntry();

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Your journey" title="Waiting List" />
        <Typography variant="body" className="px-6 text-danger">{error}</Typography>
      </ScreenContainer>
    );
  }

  if (!entry) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Your journey" title="Waiting List" />
        <EmptyState
          title="Not on the list yet"
          message="You are not on the waiting list yet. Once approved and added, your progress will appear here."
        />
      </ScreenContainer>
    );
  }

  const stage = effectiveStage(entry);
  const stageIdx = PIPELINE_STAGES.indexOf(stage as (typeof PIPELINE_STAGES)[number]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Your journey" title={entry.list_type?.name ?? 'Waiting List'} />
      <View className="px-6">
        <Badge label={stageLabel(stage)} tone="gold" />
        <Card className="mt-4 p-4">
          <Typography variant="label" className="mb-3 text-gold">Progress</Typography>
          {PIPELINE_STAGES.slice(0, 6).map((s, i) => (
            <Typography key={s} variant="body" className={i <= stageIdx ? 'text-gold' : 'text-silver'}>
              {i <= stageIdx ? '✓' : '○'} {stageLabel(s)}
            </Typography>
          ))}
        </Card>
        <Card className="mt-4 p-4">
          <Typography variant="label" className="text-gold">Your preferences</Typography>
          <View className="mt-2">
            <PreferenceBadges entry={entry} />
          </View>
        </Card>
        {entry.client_visible_note || entry.admin_notes ? (
          <Card className="mt-4 p-4">
            <Typography variant="label" className="text-gold">Message from your breeder</Typography>
            <Typography variant="body" className="mt-2">
              {entry.client_visible_note ?? entry.admin_notes}
            </Typography>
          </Card>
        ) : null}
        <Typography variant="caption" className="mt-4 text-silver">
          Payment: {entry.payment_status.replace(/_/g, ' ')}
        </Typography>
      </View>
    </ScreenContainer>
  );
}
