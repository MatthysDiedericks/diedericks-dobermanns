import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useEmployees } from '@/hooks/useEmployees';
import { formatPayslipAmount } from '@/lib/finance/payslip';
import { employeeDisplayName } from '@/lib/finance/staffCategory';

export default function EmployeesScreen() {
  const router = useRouter();
  const { data, loading, refresh } = useEmployees();

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Finance" title="Employees" />
      <View className="mb-3 flex-row gap-2 px-6">
        <Button label="Add employee" onPress={() => router.push('/(admin)/finance/employees/new' as never)} />
        <Button
          label="ENPF"
          variant="outline"
          onPress={() => router.push('/(admin)/finance/enpf' as never)}
        />
      </View>
      {loading && data.length === 0 ? (
        <View className="px-6">
          <CardListSkeleton count={3} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
          contentContainerClassName="px-6 pb-12"
          ListEmptyComponent={
            <EmptyState title="No employees yet" message="Add Felicia, Pierrie and Sweli here." />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(admin)/finance/employees/${item.id}` as never)}
              className="mb-2"
            >
              <Card className="flex-row items-center justify-between">
                <View>
                  <Typography variant="body">{employeeDisplayName(item)}</Typography>
                  <Typography variant="caption" className="text-subtle">
                    {item.job_title || 'No title'} · {item.is_active ? 'Active' : 'Ended'}
                  </Typography>
                </View>
                <Typography variant="label" className="text-gold">
                  {item.monthly_salary != null
                    ? formatPayslipAmount(item.monthly_salary, item.currency)
                    : '—'}
                </Typography>
              </Card>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}
