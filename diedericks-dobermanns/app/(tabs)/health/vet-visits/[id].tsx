import { useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ScrollView } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useVetVisit } from '@/hooks/useHealth';

export default function VetVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vetVisit, loading, error } = useVetVisit(id ?? '');
  const dog = vetVisit?.dog as { name?: string } | null;

  if (loading) {
    return (
      <ScreenContainer>
        <PageHeader title="Vet Visit" back />
        <Typography variant="body" className="px-6">Loading…</Typography>
      </ScreenContainer>
    );
  }

  if (error || !vetVisit) {
    return (
      <ScreenContainer>
        <PageHeader title="Vet Visit" back />
        <Typography variant="body" className="px-6 text-danger">{error ?? 'Visit not found'}</Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader title="Vet Visit" back />
      <ScrollView className="px-6 pb-12">
        <Card>
          <Typography variant="body">Dog: {dog?.name ?? '—'}</Typography>
          <Typography variant="body">
            Date: {vetVisit.visit_date ? format(parseISO(vetVisit.visit_date as string), 'dd MMM yyyy HH:mm') : '—'}
          </Typography>
          <Typography variant="body">Clinic: {String(vetVisit.vet_clinic ?? '—')}</Typography>
          <Typography variant="body">Reason: {String(vetVisit.reason ?? '—')}</Typography>
          <Typography variant="body" className="mt-3">Diagnosis: {String(vetVisit.diagnosis ?? '—')}</Typography>
          <Typography variant="body">Treatment: {String(vetVisit.treatment ?? '—')}</Typography>
          <Typography variant="body">Medications: {String(vetVisit.medications ?? '—')}</Typography>
          {vetVisit.cost != null ? (
            <Typography variant="body" className="mt-2">Cost: R {Number(vetVisit.cost).toFixed(2)}</Typography>
          ) : null}
          {vetVisit.notes ? (
            <Typography variant="caption" className="mt-3 text-subtle">{String(vetVisit.notes)}</Typography>
          ) : null}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
