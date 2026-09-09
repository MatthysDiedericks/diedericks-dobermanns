import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView } from 'react-native';

import { EmployeeForm } from '@/components/finance/EmployeeForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Colors } from '@/constants/colors';
import { useEmployee } from '@/hooks/useEmployees';
import { employeeDisplayName } from '@/lib/finance/staffCategory';

export default function EditEmployeeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { employee, loading } = useEmployee(id ?? '');

  return (
    <ScreenContainer>
      <PageHeader
        eyebrow="Finance"
        title={employee ? `Edit · ${employeeDisplayName(employee)}` : 'Edit employee'}
      />
      {loading && !employee ? (
        <ActivityIndicator color={Colors.gold} className="mt-8" />
      ) : employee ? (
        <ScrollView className="px-6 pb-12" keyboardShouldPersistTaps="handled">
          <EmployeeForm existing={employee} />
        </ScrollView>
      ) : null}
    </ScreenContainer>
  );
}
