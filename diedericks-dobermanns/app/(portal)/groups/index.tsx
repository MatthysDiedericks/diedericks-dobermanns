import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { usePortalGroups } from '@/hooks/usePortal';

export default function PortalGroupsScreen() {
  const { groups, loading } = usePortalGroups();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Community" title="My Groups" />
      <View className="px-6">
        <Typography variant="bodyMuted" className="mb-4">
          Your breeder sends litter and kennel updates to these groups. You will receive notifications when messages are sent.
        </Typography>
        {!loading && groups.length === 0 ? (
          <EmptyState title="No groups yet" message="You will be added when your reservation is confirmed." />
        ) : (
          groups.map((g) => (
            <Card key={g.id} className="mb-3">
              <Typography variant="subtitle">{g.name}</Typography>
              <Typography variant="caption" className="mt-1 text-silver">
                {g.type.replace(/_/g, ' ')} · {g.member_count ?? 0} members
              </Typography>
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
