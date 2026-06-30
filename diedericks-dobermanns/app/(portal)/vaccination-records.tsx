import { Alert, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { usePortalDogs } from '@/hooks/usePortal';
import { formatKennelDate } from '@/lib/kennel/formatters';
import {
  useVaccinationRecords,
  type DewormingRecord,
  type VaccinationRecord,
} from '@/hooks/useVaccinationRecords';

function dueDateTone(nextDue: string | null): 'default' | 'gold' | 'danger' {
  if (!nextDue) return 'default';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDue);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'danger';
  if (diffDays <= 30) return 'gold';
  return 'default';
}

function HealthRecordCard({
  record,
}: {
  record: VaccinationRecord | DewormingRecord;
}) {
  const tone = dueDateTone(record.next_due_date);
  const dueClass =
    tone === 'danger' ? 'text-danger' : tone === 'gold' ? 'text-gold' : 'text-silver';

  return (
    <Card className="mb-2">
      <Typography variant="subtitle">{record.title}</Typography>
      <Typography variant="caption" className="mt-1">
        Given {formatKennelDate(record.date_administered)}
      </Typography>
      {record.next_due_date ? (
        <Typography variant="caption" className={`mt-1 ${dueClass}`}>
          Next due {formatKennelDate(record.next_due_date)}
        </Typography>
      ) : null}
      {record.administered_by ? (
        <Typography variant="bodyMuted" className="mt-2">
          {record.administered_by}
        </Typography>
      ) : null}
      {record.notes ? (
        <Typography variant="bodyMuted" className="mt-1">
          {record.notes}
        </Typography>
      ) : null}
    </Card>
  );
}

export default function VaccinationRecordsScreen() {
  const { dogs, loading: dogsLoading } = usePortalDogs();
  const primaryDog = dogs[0];
  const { vaccinations, deworming, loading, error } = useVaccinationRecords(primaryDog?.id);
  const isLoading = dogsLoading || loading;
  const hasRecords = vaccinations.length > 0 || deworming.length > 0;

  return (
    <ScreenContainer>
      <PageHeader
        eyebrow="My Puppy"
        title={primaryDog ? `${primaryDog.name} — Health` : 'Vaccination Records'}
      />

      <View className="px-6 pb-10">
        {isLoading ? (
          <Typography variant="bodyMuted">Loading records…</Typography>
        ) : !primaryDog ? (
          <EmptyState
            title="No puppy linked"
            message="Your reserved or purchased puppy will appear here once linked to your account."
          />
        ) : error ? (
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        ) : !hasRecords ? (
          <EmptyState
            title="No vaccination records yet"
            message="Check back after your puppy's first vet visit."
          />
        ) : (
          <>
            <Typography variant="label" className="mb-3 text-gold">
              VACCINATIONS
            </Typography>
            {vaccinations.length === 0 ? (
              <Typography variant="bodyMuted" className="mb-6">
                No vaccinations recorded yet.
              </Typography>
            ) : (
              vaccinations.map((r) => <HealthRecordCard key={r.id} record={r} />)
            )}

            <Typography variant="label" className="mb-3 mt-6 text-gold">
              DEWORMING
            </Typography>
            {deworming.length === 0 ? (
              <Typography variant="bodyMuted" className="mb-6">
                No deworming records yet.
              </Typography>
            ) : (
              deworming.map((r) => <HealthRecordCard key={r.id} record={r} />)
            )}
          </>
        )}

        <Button
          label="Download Records"
          variant="secondary"
          fullWidth
          className="mt-8"
          onPress={() => Alert.alert('Coming soon', 'PDF download will be available in a future update.')}
        />
      </View>
    </ScreenContainer>
  );
}
