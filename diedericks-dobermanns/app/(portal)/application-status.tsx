import { View } from 'react-native';

import { JourneyBreadcrumb } from '@/components/portal/JourneyBreadcrumb';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useBuyerJourney } from '@/hooks/useBuyerJourney';
import { useMyApplications } from '@/hooks/usePortal';
import { titleCase } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import type { ApplicationStatus } from '@/types/app.types';

const TONE: Record<ApplicationStatus, BadgeTone> = {
  submitted: 'gold',
  under_review: 'neutral',
  approved: 'success',
  rejected: 'danger',
  waitlisted: 'muted',
};

export default function ApplicationStatusScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { data: applications, loading } = useMyApplications(profile?.id);
  const { currentStep } = useBuyerJourney();
  const app = applications[0];

  if (!loading && !app) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Progress" title="My Application" />
        <View className="px-6">
          <EmptyState
            title="No application found"
            message="Submit an application to begin your journey with us."
          />
          <View className="mt-6">
            <JourneyBreadcrumb currentStep={1} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Progress" title="My Application" />
      {app ? (
        <View className="px-6 pb-10">
          <View className="mb-4 flex-row items-center justify-between">
            <Typography variant="subtitle">{app.full_name}</Typography>
            <Badge label={titleCase(app.status)} tone={TONE[app.status]} />
          </View>

          <JourneyBreadcrumb currentStep={currentStep} />

          {app.admin_notes ? (
            <Card className="mt-4">
              <Typography variant="label" className="mb-1 text-gold">
                NOTES FROM THE KENNEL
              </Typography>
              <Typography variant="bodyMuted">{app.admin_notes}</Typography>
            </Card>
          ) : null}

          <Typography variant="caption" className="mt-4">
            Submitted {new Date(app.created_at).toLocaleDateString()}
          </Typography>
        </View>
      ) : null}
    </ScreenContainer>
  );
}
