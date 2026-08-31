import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { awaitingPaymentLabel } from '@/lib/waitlist/paymentGate';
import type { ApplicationStatus } from '@/types/app.types';

const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  submitted: 'gold',
  under_review: 'neutral',
  info_requested: 'neutral',
  approved: 'success',
  changes_pending: 'gold',
  rejected: 'danger',
  waitlisted: 'muted',
};

export default function AdminApplicationsScreen() {
  const router = useRouter();
  const { data: applications, loading, refetch } = useAdminApplications();
  const [showArchived, setShowArchived] = useState(false);
  const [idFailedOnly, setIdFailedOnly] = useState(false);
  const [awaitingPaymentOnly, setAwaitingPaymentOnly] = useState(false);
  const [waitlistedAppIds, setWaitlistedAppIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from('waiting_list')
      .select('application_id')
      .not('application_id', 'is', null)
      .then(({ data }) => {
        setWaitlistedAppIds(
          new Set(
            (data ?? [])
              .map((r) => r.application_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
      });
  }, [applications]);

  const visible = useMemo(
    () =>
      applications.filter((app) => {
        const archivedOk = showArchived ? Boolean(app.archived_at) : !app.archived_at;
        if (!archivedOk) return false;
        if (idFailedOnly && app.id_check_status !== 'failed') return false;
        if (awaitingPaymentOnly) {
          if (app.status !== 'approved') return false;
          if (waitlistedAppIds.has(app.id)) return false;
        }
        return true;
      }),
    [applications, showArchived, idFailedOnly, awaitingPaymentOnly, waitlistedAppIds],
  );

  const awaitingCount = applications.filter(
    (a) => !a.archived_at && a.status === 'approved' && !waitlistedAppIds.has(a.id),
  ).length;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Review" title="Applications" back={false} />
      <View className="px-6 pb-3">
        <Pressable onPress={() => setShowArchived((v) => !v)}>
          <Typography variant="caption" className="text-gold">
            {showArchived ? '← Active applications' : 'Show archived'}
          </Typography>
        </Pressable>
        <Pressable onPress={() => setIdFailedOnly((v) => !v)} className="mt-2">
          <Typography variant="caption" className="text-gold">
            {idFailedOnly ? '← All ID checks' : 'Show failed ID checks'}
          </Typography>
        </Pressable>
        <Pressable onPress={() => setAwaitingPaymentOnly((v) => !v)} className="mt-2">
          <Typography variant="caption" className="text-gold">
            {awaitingPaymentOnly
              ? '← All applications'
              : `Approved — awaiting payment (${awaitingCount})`}
          </Typography>
        </Pressable>
      </View>
      <View className="gap-3 px-6">
        {!loading && visible.length === 0 ? (
          <EmptyState
            title={
              showArchived
                ? 'No archived applications'
                : awaitingPaymentOnly
                  ? 'No approved applications awaiting payment'
                  : 'No applications yet'
            }
          />
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
                    {app.id_check_status === 'failed' ? (
                      <Typography variant="caption" className="mt-0.5 text-amber-400">
                        ID failed the format check
                      </Typography>
                    ) : app.id_type === 'sa_id' &&
                      app.country &&
                      app.country.trim().toLowerCase() !== 'south africa' ? (
                      <Typography variant="caption" className="mt-0.5 text-gold">
                        Confirm ID — country does not match a South African ID
                      </Typography>
                    ) : null}
                    {app.status === 'approved' && !waitlistedAppIds.has(app.id) ? (
                      <Typography variant="caption" className="mt-0.5 text-gold">
                        {awaitingPaymentLabel(app.reviewed_at ?? app.created_at)}
                      </Typography>
                    ) : null}
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
