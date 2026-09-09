import { ScrollView } from 'react-native';

import { EmployeeForm } from '@/components/finance/EmployeeForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function NewEmployeeScreen() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Add employee" />
      <ScrollView className="px-6 pb-12" keyboardShouldPersistTaps="handled">
        <EmployeeForm />
      </ScrollView>
    </ScreenContainer>
  );
}
