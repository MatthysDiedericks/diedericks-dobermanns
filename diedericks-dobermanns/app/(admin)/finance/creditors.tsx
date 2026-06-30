import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useState } from 'react';

import { CreditorsTab } from '@/components/finance/CreditorsTab';
import { DebtorsTab } from '@/components/finance/DebtorsTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useCreditors, useDebtors } from '@/hooks/useCreditors';

type Tab = 'debtors' | 'creditors';

export default function CreditorsDebtorsScreen() {
  const [tab, setTab] = useState<Tab>('debtors');
  const debtorsState = useDebtors();
  const creditorsState = useCreditors();

  const loading = tab === 'debtors' ? debtorsState.loading : creditorsState.loading;
  const error = tab === 'debtors' ? debtorsState.error : creditorsState.error;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Creditors & debtors" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        {(['debtors', 'creditors'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={`mr-2 rounded-full border px-4 py-2 ${
              tab === t ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{t === 'debtors' ? 'Debtors' : 'Creditors'}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView className="px-6 pb-12">
        {loading ? (
          <ActivityIndicator color={Colors.gold} className="mt-8" />
        ) : error ? (
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        ) : tab === 'debtors' ? (
          <DebtorsTab
            debtors={debtorsState.debtors}
            totalOutstanding={debtorsState.totalOutstanding}
            overdueCount={debtorsState.overdueCount}
          />
        ) : (
          <CreditorsTab
            creditors={creditorsState.creditors}
            totalPayable={creditorsState.totalPayable}
            overdueCount={creditorsState.overdueCount}
            onMarkPaid={creditorsState.markPaid}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
