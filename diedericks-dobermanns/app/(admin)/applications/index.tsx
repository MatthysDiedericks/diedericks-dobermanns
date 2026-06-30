import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAdminApplications } from '@/hooks/useAdmin';
import { titleCase } from '@/lib/format';
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
  const { data: applications, loading } = useAdminApplications();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Review" title="Applications" back={false} />
      <View className="gap-3 px-6">
        {!loading && applications.length === 0 ? (
          <EmptyState title="No applications yet" />
        ) : (
          applications.map((app) => (
            <Pressable
              key={app.id}
              onPress={() => router.push(`/(admin)/applications/${app.id}`)}
            >
              <Card className="flex-row items-center">
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Typography variant="subtitle">{app.full_name}</Typography>
                    <Badge label={titleCase(app.status)} tone={STATUS_TONE[app.status]} />
                  </View>
                  <Typography variant="caption" className="mt-1">
                    {titleCase(app.dog_interest)} · {titleCase(app.purpose)}
                  </Typography>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
