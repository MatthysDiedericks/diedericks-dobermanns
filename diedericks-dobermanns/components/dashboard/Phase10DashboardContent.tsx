import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { EnquiryWidget } from '@/components/dashboard/EnquiryWidget';
import { HeatWidgets } from '@/components/dashboard/HeatWidget';
import { LitterWidgets } from '@/components/dashboard/LitterWidget';
import { QuickStatsRow } from '@/components/dashboard/QuickStatsRow';
import { TodoWidget } from '@/components/dashboard/TodoWidget';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDashboard } from '@/hooks/useDashboard';

export function Phase10DashboardContent() {
  const { data, loading, error, refresh, completeTodo } = useDashboard();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Kennel" title="Dashboard" back={false} />
      {loading && !data ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : error ? (
        <View className="px-6">
          <Typography variant="body" className="text-danger">{error}</Typography>
          <Button label="Retry" onPress={refresh} className="mt-4" />
        </View>
      ) : data ? (
        <ScrollView
          className="px-6 pb-12"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />
          }
        >
          <QuickStatsRow />
          <LitterWidgets />
          <HeatWidgets upcoming={data.upcomingHeats} inHeat={data.inHeat} />
          <EnquiryWidget enquiries={data.enquiries} />
          <TodoWidget todos={data.todos} onComplete={completeTodo} />
        </ScrollView>
      ) : null}
    </ScreenContainer>
  );
}
