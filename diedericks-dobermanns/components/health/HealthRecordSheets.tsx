import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Pressable, View } from 'react-native';

import { HealthDueChip } from '@/components/health/HealthDueChip';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  useAddDoctorToPractice,
  useAddHealthProduct,
  useAddVetPractice,
  useBreedingDogsForHealth,
  useDewormingForDog,
  useHealthProducts,
  useVaccinationsForDog,
  useVetPractices,
  useVetVisitsForDog,
} from '@/hooks/useHealth';
import { parseDateInput, showError } from '@/lib/dogDetail/feedback';
import type { HealthProductCategory } from '@/lib/health/types';
import { formatKennelDate } from '@/lib/kennel/formatters';

export type HealthSheetMode = 'vaccination' | 'deworming' | 'vet_visit';

export interface HealthRecordSheetsHandle {
  openHistory: (mode: HealthSheetMode, dogId: string) => void;
  openAdd: (mode: HealthSheetMode, dogId?: string) => void;
  openEdit: (mode: HealthSheetMode, dogId: string, recordId: string) => void;
  close: () => void;
}

interface HealthRecordSheetsProps {
  onSaved: () => void;
}

type ViewState = 'history' | 'form';

function ChipPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-3">
      <Typography variant="caption" className="mb-2 text-muted">
        {label}
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`rounded-full border px-3 py-1.5 ${
              value === o.value ? 'border-gold bg-gold/15' : 'border-gold/20'
            }`}
          >
            <Typography variant="caption">{o.label}</Typography>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  keyboard,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  keyboard?: 'default' | 'numeric';
}) {
  return (
    <View className="mb-3">
      <Typography variant="caption" className="mb-1 text-muted">
        {label}
      </Typography>
      <BottomSheetTextInput
        value={value ?? ''}
        onChangeText={onChange}
        placeholderTextColor="#8C8474"
        keyboardType={keyboard === 'numeric' ? 'numeric' : 'default'}
        multiline={multiline}
        className="rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
        style={multiline ? { minHeight: 72, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );
}

export const HealthRecordSheets = forwardRef<HealthRecordSheetsHandle, HealthRecordSheetsProps>(
  function HealthRecordSheets({ onSaved }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['85%'], []);

    const [mode, setMode] = useState<HealthSheetMode>('vaccination');
    const [view, setView] = useState<ViewState>('form');
    const [dogId, setDogId] = useState('');
    const [recordId, setRecordId] = useState<string | undefined>();
    const [values, setValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    const { dogs } = useBreedingDogsForHealth();
    const productCategory: HealthProductCategory =
      mode === 'vaccination'
        ? 'vaccination'
        : values.treatment_type === 'tick_flea'
          ? 'tick_flea'
          : 'deworming';
    const { products, refresh: refreshProducts } = useHealthProducts(
      mode === 'vet_visit' ? undefined : productCategory,
    );
    const { practices, refresh: refreshPractices } = useVetPractices();
    const addProduct = useAddHealthProduct();
    const addPractice = useAddVetPractice();
    const addDoctor = useAddDoctorToPractice();

    const vac = useVaccinationsForDog(dogId);
    const dew = useDewormingForDog(dogId);
    const vet = useVetVisitsForDog(dogId);

    const selectedPractice = practices.find((p) => p.id === values.vet_practice_id);
    const doctors = selectedPractice?.vet_names ?? [];

    const filteredProducts = products.filter((p) =>
      p.product_name.toLowerCase().includes(productSearch.toLowerCase()),
    );

    const resetForm = useCallback(
      (m: HealthSheetMode, dId: string) => {
        const today = new Date().toISOString().slice(0, 10);
        setMode(m);
        setDogId(dId);
        setRecordId(undefined);
        setProductSearch('');
        if (m === 'vaccination') {
          setValues({
            dog_id: dId,
            schedule_type: 'annual',
            date_administered: today,
          });
        } else if (m === 'deworming') {
          setValues({
            dog_id: dId,
            treatment_type: 'deworming',
            schedule_type: 'quarterly',
            date_treated: today,
          });
        } else {
          setValues({
            dog_id: dId,
            schedule_type: 'none',
            visit_date: today,
          });
        }
      },
      [],
    );

    useImperativeHandle(ref, () => ({
      openHistory: (m, dId) => {
        setMode(m);
        setDogId(dId);
        setView('history');
        sheetRef.current?.present();
      },
      openAdd: (m, dId) => {
        resetForm(m, dId ?? dogs[0]?.id ?? '');
        setView('form');
        sheetRef.current?.present();
      },
      openEdit: (m, dId, rId) => {
        setMode(m);
        setDogId(dId);
        setRecordId(rId);
        setView('form');
        sheetRef.current?.present();
      },
      close: () => sheetRef.current?.dismiss(),
    }));

    async function onSave() {
      setSaving(true);
      try {
        if (mode === 'vaccination') {
          const date = parseDateInput(values.date_administered ?? '');
          if (!values.dog_id || !values.vaccine_name?.trim() || !date) {
            showError('Dog, vaccine, and date are required.');
            return;
          }
          await vac.saveVaccination(
            {
              dog_id: values.dog_id,
              vaccine_name: values.vaccine_name,
              date_administered: date,
              schedule_type: values.schedule_type ?? 'annual',
              doctor_name: values.doctor_name ?? null,
              vet_practice_id: values.vet_practice_id ?? null,
              health_product_id: values.health_product_id ?? null,
              batch_number: values.batch_number ?? null,
              notes: values.notes ?? null,
              next_due_date:
                values.schedule_type === 'custom'
                  ? parseDateInput(values.next_due_date ?? '')
                  : null,
            },
            recordId,
          );
        } else if (mode === 'deworming') {
          const date = parseDateInput(values.date_treated ?? '');
          if (!values.dog_id || !values.product_name?.trim() || !date) {
            showError('Dog, product, and date are required.');
            return;
          }
          await dew.saveRecord(
            {
              dog_id: values.dog_id,
              product_name: values.product_name,
              date_treated: date,
              treatment_type: values.treatment_type ?? 'deworming',
              schedule_type: values.schedule_type ?? 'quarterly',
              doctor_name: values.doctor_name ?? null,
              vet_practice_id: values.vet_practice_id ?? null,
              health_product_id: values.health_product_id ?? null,
              notes: values.notes ?? null,
              next_due_date:
                values.schedule_type === 'custom'
                  ? parseDateInput(values.next_due_date ?? '')
                  : null,
            },
            recordId,
          );
        } else {
          const date = parseDateInput(values.visit_date ?? '');
          if (!values.dog_id || !date || !values.reason?.trim()) {
            showError('Dog, date, and reason are required.');
            return;
          }
          const costRaw = values.cost?.trim();
          await vet.saveVisit(
            {
              dog_id: values.dog_id,
              visit_date: date,
              reason: values.reason.trim(),
              schedule_type: values.schedule_type ?? 'none',
              doctor_name: values.doctor_name ?? null,
              vet_practice_id: values.vet_practice_id ?? null,
              diagnosis: values.diagnosis ?? null,
              treatment: values.treatment ?? null,
              medications: values.medications ?? null,
              cost: costRaw ? Number(costRaw) : null,
              notes: values.notes ?? null,
              next_due_date:
                values.schedule_type === 'custom'
                  ? parseDateInput(values.next_due_date ?? '')
                  : null,
            },
            recordId,
          );
        }
        sheetRef.current?.dismiss();
        onSaved();
      } catch (e) {
        showError(e instanceof Error ? e.message : undefined);
      } finally {
        setSaving(false);
      }
    }

    async function onAddProductInline() {
      const name = values.new_product_name?.trim();
      if (!name) return;
      const cat: HealthProductCategory =
        mode === 'vaccination'
          ? 'vaccination'
          : values.treatment_type === 'tick_flea'
            ? 'tick_flea'
            : 'deworming';
      const p = await addProduct({
        product_name: name,
        category: cat,
        manufacturer: values.new_manufacturer ?? null,
        default_schedule_type: values.schedule_type ?? 'annual',
      });
      await refreshProducts();
      setValues((s) => ({
        ...s,
        vaccine_name: p.product_name,
        product_name: p.product_name,
        health_product_id: p.id,
        new_product_name: '',
      }));
    }

    async function onAddPracticeInline() {
      const name = values.new_practice_name?.trim();
      if (!name) return;
      const p = await addPractice({
        practice_name: name,
        phone: values.new_practice_phone ?? null,
        email: values.new_practice_email ?? null,
        address: values.new_practice_address ?? null,
      });
      await refreshPractices();
      setValues((s) => ({ ...s, vet_practice_id: p.id, new_practice_name: '' }));
    }

    async function onAddDoctorInline() {
      const name = values.new_doctor_name?.trim();
      if (!name || !values.vet_practice_id || !selectedPractice) return;
      await addDoctor(values.vet_practice_id, name, selectedPractice.vet_names ?? []);
      await refreshPractices();
      setValues((s) => ({ ...s, doctor_name: name, new_doctor_name: '' }));
    }

    const title =
      view === 'history'
        ? `${mode === 'vaccination' ? 'Vaccination' : mode === 'deworming' ? 'Treatment' : 'Vet Visit'} History`
        : recordId
          ? 'Edit Record'
          : `Add ${mode === 'vaccination' ? 'Vaccination' : mode === 'deworming' ? 'Treatment' : 'Vet Visit'}`;

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: '#1C1A0E' }}
        handleIndicatorStyle={{ backgroundColor: '#C4A35A' }}
      >
        <BottomSheetScrollView className="px-5 pb-12">
          <Typography variant="subtitle" className="mb-4 text-gold">
            {title}
          </Typography>

          {view === 'history' ? (
            <>
              {(mode === 'vaccination' ? vac.vaccinations : mode === 'deworming' ? dew.records : vet.visits).map(
                (item) => {
                  const id = item.id as string;
                  const label =
                    mode === 'vaccination'
                      ? (item as { vaccine_name: string }).vaccine_name
                      : mode === 'deworming'
                        ? (item as { product_name: string }).product_name ?? 'Treatment'
                        : (item as { reason: string }).reason;
                  const date =
                    mode === 'vaccination'
                      ? (item as { date_administered: string }).date_administered
                      : mode === 'deworming'
                        ? (item as { date_treated: string }).date_treated
                        : (item as { visit_date: string }).visit_date;
                  const nextDue = (item as { next_due_date?: string | null }).next_due_date ?? null;
                  return (
                    <Pressable
                      key={id}
                      onLongPress={() =>
                        Alert.alert('Delete record?', 'This cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              void (mode === 'vaccination'
                                ? vac.deleteVaccination(id)
                                : mode === 'deworming'
                                  ? dew.deleteRecord(id)
                                  : vet.deleteVisit(id)
                              ).then(onSaved);
                            },
                          },
                        ])
                      }
                      className="mb-2 flex-row items-center justify-between rounded-lg border border-gold/15 p-3"
                    >
                      <View className="flex-1">
                        <Typography variant="body">{label}</Typography>
                        <Typography variant="caption" className="text-muted">
                          {formatKennelDate(date)}
                        </Typography>
                      </View>
                      <HealthDueChip nextDue={nextDue} />
                    </Pressable>
                  );
                },
              )}
              <Button
                label="+ Add Record"
                onPress={() => {
                  resetForm(mode, dogId);
                  setView('form');
                }}
                fullWidth
                className="mt-3"
              />
            </>
          ) : (
            <>
              <ChipPicker
                label="Dog *"
                value={values.dog_id ?? ''}
                onChange={(v) => {
                  setDogId(v);
                  setValues((s) => ({ ...s, dog_id: v }));
                }}
                options={dogs.map((d) => ({ value: d.id, label: d.name }))}
              />

              {mode === 'deworming' ? (
                <ChipPicker
                  label="Treatment type"
                  value={values.treatment_type ?? 'deworming'}
                  onChange={(v) => setValues((s) => ({ ...s, treatment_type: v, product_name: '' }))}
                  options={[
                    { value: 'deworming', label: 'Deworming' },
                    { value: 'tick_flea', label: 'Tick & Flea' },
                    { value: 'both', label: 'Both' },
                  ]}
                />
              ) : null}

              {mode !== 'vet_visit' ? (
                <>
                  <Field label="Search product" value={productSearch} onChange={setProductSearch} />
                  <View className="mb-3 flex-row flex-wrap gap-2">
                    {filteredProducts.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() =>
                          setValues((s) => ({
                            ...s,
                            vaccine_name: p.product_name,
                            product_name: p.product_name,
                            health_product_id: p.id,
                            schedule_type: p.default_schedule_type ?? s.schedule_type,
                          }))
                        }
                        className={`rounded-full border px-3 py-1.5 ${
                          values.health_product_id === p.id ? 'border-gold bg-gold/15' : 'border-gold/20'
                        }`}
                      >
                        <Typography variant="caption">{p.product_name}</Typography>
                      </Pressable>
                    ))}
                  </View>
                  <Field
                    label={mode === 'vaccination' ? 'Vaccine name *' : 'Product name *'}
                    value={mode === 'vaccination' ? values.vaccine_name : values.product_name}
                    onChange={(v) =>
                      setValues((s) =>
                        mode === 'vaccination' ? { ...s, vaccine_name: v } : { ...s, product_name: v },
                      )
                    }
                  />
                  <Field label="New product name" value={values.new_product_name} onChange={(v) => setValues((s) => ({ ...s, new_product_name: v }))} />
                  <Button label="Add new product" variant="outline" onPress={() => void onAddProductInline()} fullWidth className="mb-3" />
                </>
              ) : null}

              <Typography variant="caption" className="mb-2 text-gold">
                ADMINISTERED BY
              </Typography>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {practices.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setValues((s) => ({ ...s, vet_practice_id: p.id, doctor_name: '' }))}
                    className={`rounded-full border px-3 py-1.5 ${
                      values.vet_practice_id === p.id ? 'border-gold bg-gold/15' : 'border-gold/20'
                    }`}
                  >
                    <Typography variant="caption">{p.practice_name}</Typography>
                  </Pressable>
                ))}
              </View>
              <Field label="New practice name" value={values.new_practice_name} onChange={(v) => setValues((s) => ({ ...s, new_practice_name: v }))} />
              <Button label="Add new practice" variant="outline" onPress={() => void onAddPracticeInline()} fullWidth className="mb-3" />

              {doctors.length > 0 ? (
                <ChipPicker
                  label="Doctor / Vet"
                  value={values.doctor_name ?? ''}
                  onChange={(v) => setValues((s) => ({ ...s, doctor_name: v }))}
                  options={doctors.map((d) => ({ value: d, label: d }))}
                />
              ) : null}
              <Field label="New doctor name" value={values.new_doctor_name} onChange={(v) => setValues((s) => ({ ...s, new_doctor_name: v }))} />
              <Button label="Add doctor to practice" variant="outline" onPress={() => void onAddDoctorInline()} fullWidth className="mb-3" />

              <Field
                label={mode === 'vet_visit' ? 'Visit date *' : 'Date administered *'}
                value={mode === 'vet_visit' ? values.visit_date : mode === 'deworming' ? values.date_treated : values.date_administered}
                onChange={(v) =>
                  setValues((s) =>
                    mode === 'vet_visit'
                      ? { ...s, visit_date: v }
                      : mode === 'deworming'
                        ? { ...s, date_treated: v }
                        : { ...s, date_administered: v },
                  )
                }
              />

              {mode === 'vaccination' ? (
                <Field label="Batch number" value={values.batch_number} onChange={(v) => setValues((s) => ({ ...s, batch_number: v }))} />
              ) : null}

              {mode === 'vet_visit' ? (
                <>
                  <Field label="Reason *" value={values.reason} onChange={(v) => setValues((s) => ({ ...s, reason: v }))} />
                  <ChipPicker
                    label="Quick reason"
                    value=""
                    onChange={(v) => setValues((s) => ({ ...s, reason: v }))}
                    options={[
                      { value: 'Annual Checkup', label: 'Annual Checkup' },
                      { value: 'Illness', label: 'Illness' },
                      { value: 'Injury', label: 'Injury' },
                      { value: 'Follow-up', label: 'Follow-up' },
                    ]}
                  />
                  <Field label="Diagnosis" value={values.diagnosis} onChange={(v) => setValues((s) => ({ ...s, diagnosis: v }))} multiline />
                  <Field label="Treatment" value={values.treatment} onChange={(v) => setValues((s) => ({ ...s, treatment: v }))} multiline />
                  <Field label="Medications" value={values.medications} onChange={(v) => setValues((s) => ({ ...s, medications: v }))} />
                  <Field label="Cost (R)" value={values.cost} onChange={(v) => setValues((s) => ({ ...s, cost: v }))} keyboard="numeric" />
                </>
              ) : null}

              {mode === 'deworming' ? (
                <Field label="Dosage" value={values.dosage} onChange={(v) => setValues((s) => ({ ...s, dosage: v }))} />
              ) : null}

              <ChipPicker
                label="Schedule"
                value={values.schedule_type ?? 'annual'}
                onChange={(v) => setValues((s) => ({ ...s, schedule_type: v }))}
                options={
                  mode === 'vaccination'
                    ? [
                        { value: 'annual', label: 'Annual' },
                        { value: 'biannual', label: 'Biannual' },
                        { value: 'quarterly', label: 'Quarterly' },
                        { value: 'custom', label: 'Custom Date' },
                      ]
                    : mode === 'deworming'
                      ? [
                          { value: 'monthly', label: 'Monthly' },
                          { value: 'quarterly', label: 'Quarterly' },
                          { value: 'biannual', label: 'Biannual' },
                          { value: 'custom', label: 'Custom Date' },
                        ]
                      : [
                          { value: 'none', label: 'None' },
                          { value: 'annual', label: 'Annual' },
                          { value: 'biannual', label: 'Biannual' },
                          { value: 'quarterly', label: 'Quarterly' },
                          { value: 'custom', label: 'Custom Date' },
                        ]
                }
              />

              {values.schedule_type === 'custom' ? (
                <Field label="Custom next due date" value={values.next_due_date} onChange={(v) => setValues((s) => ({ ...s, next_due_date: v }))} />
              ) : values.schedule_type !== 'none' ? (
                <Typography variant="caption" className="mb-4 text-muted">
                  Next due date will be calculated automatically when saved.
                </Typography>
              ) : null}

              <Field label="Notes" value={values.notes} onChange={(v) => setValues((s) => ({ ...s, notes: v }))} multiline />
              <Button label="Save" onPress={() => void onSave()} loading={saving} fullWidth />
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
