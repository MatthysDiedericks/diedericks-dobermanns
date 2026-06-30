import { Alert, FlatList, Pressable, View } from 'react-native';
import { useRef, useState } from 'react';

import { AccordionSection } from '@/components/dogs/detail/AccordionSection';
import { EmptyTabState } from '@/components/dogs/detail/EmptyTabState';
import {
  RecordBottomSheet,
  type RecordSheetRef,
} from '@/components/dogs/detail/RecordBottomSheet';
import {
  CONDITION_FIELDS,
  TEST_FIELDS,
  VACC_FIELDS,
  VISIT_FIELDS,
} from '@/components/dogs/detail/dogHealthFields';
import { Typography } from '@/components/ui/Typography';
import { useHealthTests, useMedicalConditions } from '@/hooks/useDogDetail';
import {
  useVaccinationsForDog,
  useVetVisitsForDog,
} from '@/hooks/useHealth';
import { parseDateInput, showError, showSaved } from '@/lib/dogDetail/feedback';
import { formatKennelDate, isOverdue } from '@/lib/kennel/formatters';

function confirmDelete(label: string, onDelete: () => void) {
  Alert.alert(`Delete ${label}?`, 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
  ]);
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mb-3 rounded-lg border border-gold/30 py-2">
      <Typography variant="caption" className="text-center text-gold">
        + {label}
      </Typography>
    </Pressable>
  );
}

export function DogHealthRecordsSection({ dogId }: { dogId: string }) {
  const vac = useVaccinationsForDog(dogId);
  const visits = useVetVisitsForDog(dogId);
  const tests = useHealthTests(dogId);
  const conditions = useMedicalConditions(dogId);

  const vacSheet = useRef<RecordSheetRef>(null);
  const visitSheet = useRef<RecordSheetRef>(null);
  const testSheet = useRef<RecordSheetRef>(null);
  const condSheet = useRef<RecordSheetRef>(null);

  const [vacValues, setVacValues] = useState<Record<string, string>>({});
  const [visitValues, setVisitValues] = useState<Record<string, string>>({});
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [condValues, setCondValues] = useState<Record<string, string>>({});

  const sortedConditions = [...conditions.conditions].sort(
    (a, b) => Number(b.is_active) - Number(a.is_active),
  );

  async function saveVac() {
    const date = parseDateInput(vacValues.date_administered ?? '');
    if (!vacValues.vaccine_name?.trim() || !date) {
      showError('Vaccine name and date are required.');
      return;
    }
    try {
      await vac.addVaccination({
        dog_id: dogId,
        vaccine_name: vacValues.vaccine_name.trim(),
        date_administered: date,
        next_due_date: parseDateInput(vacValues.next_due_date ?? ''),
        administered_by: vacValues.administered_by?.trim() || null,
        batch_number: vacValues.batch_number?.trim() || null,
        notes: vacValues.notes?.trim() || null,
      });
      showSaved();
      setVacValues({});
      vacSheet.current?.close();
    } catch {
      showError();
    }
  }

  async function saveVisit() {
    const date = parseDateInput(visitValues.visit_date ?? '');
    if (!date || !visitValues.reason?.trim()) {
      showError('Visit date and reason are required.');
      return;
    }
    const costRaw = visitValues.cost?.trim();
    const cost = costRaw ? Number(costRaw) : null;
    try {
      await visits.addVisit({
        dog_id: dogId,
        visit_date: date,
        reason: visitValues.reason.trim(),
        doctor_name: visitValues.vet_name?.trim() || null,
        vet_clinic: visitValues.vet_clinic?.trim() || null,
        schedule_type: visitValues.follow_up_date ? 'custom' : 'none',
        diagnosis: visitValues.diagnosis?.trim() || null,
        treatment: visitValues.treatment?.trim() || null,
        medications: visitValues.medications?.trim() || null,
        follow_up_date: parseDateInput(visitValues.follow_up_date ?? ''),
        cost: cost != null && Number.isFinite(cost) ? cost : null,
        notes: visitValues.notes?.trim() || null,
      });
      showSaved();
      setVisitValues({});
      visitSheet.current?.close();
    } catch {
      showError();
    }
  }

  async function saveTest() {
    if (!testValues.test_name?.trim()) {
      showError('Test name is required.');
      return;
    }
    try {
      await tests.addTest({
        test_name: testValues.test_name.trim(),
        result: testValues.result?.trim() || null,
        tested_date: parseDateInput(testValues.tested_date ?? ''),
        lab: testValues.lab?.trim() || null,
        notes: testValues.notes?.trim() || null,
      });
      setTestValues({});
      testSheet.current?.close();
    } catch {
      /* hook alerts */
    }
  }

  async function saveCondition() {
    if (!condValues.condition_name?.trim()) {
      showError('Condition name is required.');
      return;
    }
    try {
      await conditions.addCondition({
        condition_name: condValues.condition_name.trim(),
        diagnosed_date: parseDateInput(condValues.diagnosed_date ?? ''),
        notes: condValues.notes?.trim() || null,
      });
      setCondValues({});
      condSheet.current?.close();
    } catch {
      /* hook alerts */
    }
  }

  return (
    <>
      <AccordionSection title="Vaccinations" count={vac.vaccinations.length} defaultOpen>
        <AddButton label="Add Vaccination" onPress={() => vacSheet.current?.open()} />
        {vac.vaccinations.length === 0 ? (
          <EmptyTabState message="No vaccinations recorded." />
        ) : (
          <FlatList
            data={vac.vaccinations}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const overdue = isOverdue(item.next_due_date as string | null);
              return (
                <Pressable
                  onLongPress={() =>
                    confirmDelete('vaccination', () => void vac.deleteVaccination(String(item.id)))
                  }
                  className="mb-2 flex-row items-center justify-between border-b border-gold/10 py-2"
                >
                  <View className="flex-1">
                    <Typography variant="body">{String(item.vaccine_name)}</Typography>
                    <Typography variant="caption">
                      {formatKennelDate(item.date_administered as string)}
                      {item.next_due_date
                        ? ` · Due ${formatKennelDate(item.next_due_date as string)}`
                        : ''}
                    </Typography>
                  </View>
                  {overdue ? <View className="h-2 w-2 rounded-full bg-danger" /> : null}
                </Pressable>
              );
            }}
          />
        )}
      </AccordionSection>

      <AccordionSection title="Vet visits" count={visits.visits.length}>
        <AddButton label="Add Visit" onPress={() => visitSheet.current?.open()} />
        {visits.visits.length === 0 ? (
          <EmptyTabState message="No vet visits recorded." />
        ) : (
          <FlatList
            data={visits.visits}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                onLongPress={() =>
                  confirmDelete('visit', () => void visits.deleteVisit(String(item.id)))
                }
                className="mb-2 border-b border-gold/10 py-2"
              >
                <Typography variant="body">
                  {formatKennelDate(item.visit_date as string)} · {String(item.reason)}
                </Typography>
                <Typography variant="caption" className="text-muted">
                  {String(item.vet_name ?? item.vet_clinic ?? '—')}
                </Typography>
              </Pressable>
            )}
          />
        )}
      </AccordionSection>

      <AccordionSection title="Health tests" count={tests.tests.length}>
        <AddButton label="Add Test" onPress={() => testSheet.current?.open()} />
        {tests.tests.length === 0 ? (
          <EmptyTabState message="No health tests recorded." />
        ) : (
          <FlatList
            data={tests.tests}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                onLongPress={() => confirmDelete('test', () => void tests.deleteTest(item.id))}
                className="mb-2 border-b border-gold/10 py-2"
              >
                <Typography variant="body">
                  {item.test_name}
                  {item.result ? ` · ${item.result}` : ''}
                </Typography>
                <Typography variant="caption">{formatKennelDate(item.tested_date)}</Typography>
              </Pressable>
            )}
          />
        )}
      </AccordionSection>

      <AccordionSection title="Medical conditions" count={conditions.conditions.length}>
        <AddButton label="Add Condition" onPress={() => condSheet.current?.open()} />
        {sortedConditions.length === 0 ? (
          <EmptyTabState message="No medical conditions recorded." />
        ) : (
          <FlatList
            data={sortedConditions}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  void conditions.updateCondition(item.id, { is_active: !item.is_active })
                }
                onLongPress={() =>
                  confirmDelete('condition', () => void conditions.deleteCondition(item.id))
                }
                className={`mb-2 rounded-lg border p-3 ${
                  item.is_active ? 'border-gold/40' : 'border-gold/10 opacity-60'
                }`}
              >
                <Typography variant="body">{item.condition_name}</Typography>
                <Typography variant="caption">
                  {formatKennelDate(item.diagnosed_date)} ·{' '}
                  {item.is_active ? 'Active' : 'Resolved'}
                </Typography>
              </Pressable>
            )}
          />
        )}
      </AccordionSection>

      <RecordBottomSheet ref={vacSheet} title="Add Vaccination" fields={VACC_FIELDS} values={vacValues} onChange={(k, v) => setVacValues((s) => ({ ...s, [k]: v }))} onSave={() => void saveVac()} />
      <RecordBottomSheet ref={visitSheet} title="Add Vet Visit" fields={VISIT_FIELDS} values={visitValues} onChange={(k, v) => setVisitValues((s) => ({ ...s, [k]: v }))} onSave={() => void saveVisit()} />
      <RecordBottomSheet ref={testSheet} title="Add Health Test" fields={TEST_FIELDS} values={testValues} onChange={(k, v) => setTestValues((s) => ({ ...s, [k]: v }))} onSave={() => void saveTest()} />
      <RecordBottomSheet ref={condSheet} title="Add Condition" fields={CONDITION_FIELDS} values={condValues} onChange={(k, v) => setCondValues((s) => ({ ...s, [k]: v }))} onSave={() => void saveCondition()} />
    </>
  );
}
