import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { AppQuoteBuilder } from '@/components/finance/AppQuoteBuilder';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Colors } from '@/constants/colors';
import { useQuoteDetail } from '@/hooks/useQuotes';
import { buildAppQuotePrefill, type AppQuotePrefill } from '@/lib/finance/buildAppQuotePrefill';

export default function QuoteBuilderScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    waitlistId?: string;
    clientId?: string;
    walkinName?: string;
    walkinContact?: string;
    dogId?: string;
    litterId?: string;
    applicationId?: string;
  }>();
  const { quote: initial, loading } = useQuoteDetail(params.id ?? '');
  const [application, setApplication] = useState<AppQuotePrefill | undefined>();

  useEffect(() => {
    if (!params.applicationId || params.id) return;
    void buildAppQuotePrefill(params.applicationId)
      .then(setApplication)
      .catch(() => setApplication(undefined));
  }, [params.applicationId, params.id]);

  if ((params.id && loading) || (params.applicationId && !params.id && !application)) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  return (
    <AppQuoteBuilder
      key={initial?.id ?? params.applicationId ?? 'new'}
      initial={params.id ? initial : undefined}
      prefill={{
        waitlistId: params.waitlistId,
        clientId: params.clientId,
        walkinName: params.walkinName,
        walkinContact: params.walkinContact,
        dogId: params.dogId,
        litterId: params.litterId,
        applicationId: params.applicationId,
        application,
      }}
    />
  );
}
