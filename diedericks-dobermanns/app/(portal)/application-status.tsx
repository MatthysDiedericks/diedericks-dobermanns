import { View } from 'react-native';

import { JourneyBreadcrumb } from '@/components/portal/JourneyBreadcrumb';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useBuyerJourney } from '@/hooks/useBuyerJourney';
import { useMyApplications } from '@/hooks/usePortal';
import { canApplyAgain } from '@/lib/applications/applyAgain';
import { clientStatusLabel, SENT_TO_MATT } from '@/lib/applications/fieldTiers';
import type { ApplicationStatus } from '@/types/app.types';
import { useRouter } from 'expo-router';

const TONE: Record<ApplicationStatus, BadgeTone> = {
  submitted: 'gold',
  under_review: 'neutral',
  info_requested: 'neutral',
  approved: 'success',
  changes_pending: 'gold',
  rejected: 'danger',
  waitlisted: 'muted',
};

export default function ApplicationStatusScreen() {
  const router = useRouter();
  const { data: applications, loading } = useMyApplications();
  const { currentStep, quoteRevision, quoteRevisionNote } = useBuyerJourney();
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
            <Badge
              label={clientStatusLabel(app.status)}
              tone={TONE[app.status] ?? 'gold'}
            />
          </View>

          <JourneyBreadcrumb currentStep={currentStep} />

          {quoteRevision || quoteRevisionNote ? (
            <Card className="mt-4">
              <Typography variant="label" className="mb-1 text-gold">
                YOUR QUOTE
              </Typography>
              {quoteRevision ? (
                <Typography variant="body">Current revision {quoteRevision}</Typography>
              ) : null}
              {quoteRevisionNote ? (
                <Typography variant="bodyMuted" className="mt-1">
                  {quoteRevisionNote}
                </Typography>
              ) : null}
            </Card>
          ) : null}

          {app.status === 'changes_pending' ? (
            <Card className="mt-4">
              <Typography variant="bodyMuted">{SENT_TO_MATT}</Typography>
            </Card>
          ) : app.admin_notes ? (
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
          <View className="mt-6">
            <Button
              label="Update my details"
              variant="outline"
              onPress={() => router.push('/(portal)/application-edit' as never)}
            />
          </View>
          {canApplyAgain(app.status) ? (
            <View className="mt-3">
              <Button
                label="Apply for another dog"
                variant="outline"
                onPress={() => router.push('/(portal)/application-another' as never)}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </ScreenContainer>
  );
}
