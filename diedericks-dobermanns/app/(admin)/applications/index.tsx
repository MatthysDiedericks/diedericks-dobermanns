import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ApplicationArchiveBlock } from '@/components/applications/ApplicationArchiveBlock';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAdminApplications } from '@/hooks/useAdmin';
import { formatDateTime, titleCase } from '@/lib/format';
import type { ApplicationStatus } from '@/types/app.types';

const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  submitted: 'gold',
  under_review: 'neutral',
  approved: 'success',
  rejected: 'danger',
  waitlisted: 'muted',
};

export default function AdminApplicationsScreen() {
  const router = useRouter();
  const { data: applications, loading, refetch } = useAdminApplications();
  const [showArchived, setShowArchived] = useState(false);

  const visible = useMemo(
    () =>
      applications.filter((app) => (showArchived ? Boolean(app.archived_at) : !app.archived_at)),
    [applications, showArchived],
  );

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Review" title="Applications" back={false} />
      <View className="px-6 pb-3">
        <Pressable onPress={() => setShowArchived((v) => !v)}>
          <Typography variant="caption" className="text-gold">
            {showArchived ? '← Active applications' : 'Show archived'}
          </Typography>
        </Pressable>
      </View>
      <View className="gap-3 px-6">
        {!loading && visible.length === 0 ? (
          <EmptyState title={showArchived ? 'No archived applications' : 'No applications yet'} />
        ) : (
          visible.map((app) => (
            <Card key={app.id}>
              <Pressable onPress={() => router.push(`/(admin)/applications/${app.id}`)}>
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Typography variant="subtitle">{app.full_name}</Typography>
                      <Badge label={titleCase(app.status)} tone={STATUS_TONE[app.status]} />
                    </View>
                    <Typography variant="caption" className="mt-1">
                      {titleCase(app.dog_interest)} · {titleCase(app.purpose)}
                    </Typography>
                    <Typography variant="caption" className="mt-0.5 opacity-60">
                      {showArchived && app.archived_reason
                        ? `${app.archived_reason} · ${formatDateTime(app.archived_at ?? app.created_at)}`
                        : `Received ${formatDateTime(app.created_at)}`}
                    </Typography>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
                </View>
              </Pressable>
              <ApplicationArchiveBlock
                applicationId={app.id}
                archivedAt={app.archived_at}
                archivedReason={app.archived_reason}
                onDone={() => void refetch()}
              />
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
