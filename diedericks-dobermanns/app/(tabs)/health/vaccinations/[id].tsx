import { useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ScrollView } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useVaccination } from '@/hooks/useHealth';

export default function VaccinationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaccination, loading, error } = useVaccination(id ?? '');
  const dog = vaccination?.dog as { name?: string } | null;

  if (loading) {
    return (
      <ScreenContainer>
        <PageHeader title="Vaccination" back />
        <Typography variant="body" className="px-6">Loading…</Typography>
      </ScreenContainer>
    );
  }

  if (error || !vaccination) {
    return (
      <ScreenContainer>
        <PageHeader title="Vaccination" back />
        <Typography variant="body" className="px-6 text-danger">{error ?? 'Record not found'}</Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader title={String(vaccination.vaccine_name ?? 'Vaccination')} back />
      <ScrollView className="px-6 pb-12">
        <Card>
          <Typography variant="body">Dog: {dog?.name ?? '—'}</Typography>
          <Typography variant="body">
            Administered: {vaccination.date_administered ? format(parseISO(vaccination.date_administered as string), 'dd MMM yyyy') : '—'}
          </Typography>
          <Typography variant="body">
            Next due: {vaccination.next_due_date ? format(parseISO(vaccination.next_due_date as string), 'dd MMM yyyy') : '—'}
          </Typography>
          <Typography variant="body">By: {String(vaccination.administered_by ?? '—')}</Typography>
          {vaccination.notes ? (
            <Typography variant="caption" className="mt-3 text-subtle">{String(vaccination.notes)}</Typography>
          ) : null}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
