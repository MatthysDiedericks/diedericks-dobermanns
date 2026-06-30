import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useMyApplications } from '@/hooks/usePortal';
import { titleCase } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import type { ApplicationStatus } from '@/types/app.types';

const STEPS: { status: ApplicationStatus; label: string }[] = [
  { status: 'submitted', label: 'Submitted' },
  { status: 'under_review', label: 'Under Review' },
  { status: 'approved', label: 'Decision' },
];

const TONE: Record<ApplicationStatus, BadgeTone> = {
  submitted: 'gold',
  under_review: 'neutral',
  approved: 'success',
  rejected: 'danger',
  waitlisted: 'muted',
};

function stepIndex(status: ApplicationStatus): number {
  if (status === 'submitted') return 0;
  if (status === 'under_review') return 1;
  return 2; // approved / rejected / waitlisted are all "decided"
}

export default function ApplicationStatusScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { data: applications, loading } = useMyApplications(profile?.id);
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
        </View>
      </ScreenContainer>
    );
  }

  const current = app ? stepIndex(app.status) : 0;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Progress" title="My Application" />
      {app ? (
        <View className="px-6">
          <View className="mb-6 flex-row items-center justify-between">
            <Typography variant="subtitle">{app.full_name}</Typography>
            <Badge label={titleCase(app.status)} tone={TONE[app.status]} />
          </View>

          <Card>
            {STEPS.map((step, i) => {
              const done = i < current;
              const active = i === current;
              return (
                <View key={step.status} className="flex-row items-start">
                  <View className="items-center">
                    <View
                      className={`h-8 w-8 items-center justify-center rounded-full ${
                        done || active ? 'bg-gold' : 'bg-surface'
                      }`}
                    >
                      <Ionicons
                        name={done ? 'checkmark' : 'ellipse'}
                        size={done ? 16 : 8}
                        color={done || active ? Colors.black : Colors.silver}
                      />
                    </View>
                    {i < STEPS.length - 1 ? (
                      <View className={`h-10 w-0.5 ${done ? 'bg-gold' : 'bg-surface'}`} />
                    ) : null}
                  </View>
                  <View className="ml-4 pb-6">
                    <Typography variant="subtitle" className={active ? 'text-gold' : ''}>
                      {i === 2 ? titleCase(app.status) : step.label}
                    </Typography>
                    {active && app.admin_notes ? (
                      <Typography variant="bodyMuted" className="mt-1">
                        {app.admin_notes}
                      </Typography>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </Card>

          <Typography variant="caption" className="mt-4">
            Submitted {new Date(app.created_at).toLocaleDateString()}
          </Typography>
        </View>
      ) : null}
    </ScreenContainer>
  );
}
